// ─── src/services/firestoreService.ts ────────────────────────────────────────
// Status transition logic:
//
//   pending   → confirmed  : status only (booking accepted)
//   confirmed → ongoing    : writes actualStartTime (trip timer STARTS)
//   ongoing   → completed  : atomic transaction — writes actualEndTime,
//                            computes actualDurationMins, calculates
//                            waitingSurcharge, writes finalFare
//   * → cancelled          : status only
//
// Surcharge rules (standard Distance bookings only):
//   extraMins = actualDurationMins - estimatedDurationMins
//   billable  = max(0, extraMins - freeWaitingMins)
//   blocks    = ceil(billable / waitingIntervalMins)
//   surcharge = blocks × waitingChargePerInterval
//   finalFare = originalFare + surcharge
//
// Surcharge is never applied to Hourly, Full Day, or Immediate bookings.
// If estimatedDurationMins is missing (legacy booking), surcharge = 0.
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  runTransaction,
  orderBy,
  serverTimestamp,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  getBookingPolicy,
  calculateWaitingSurcharge,
} from "./bookingPolicyService";
import type {
  Booking,
  BookingStatus,
  BookingType,
  CreateBookingPayload,
  LatLng,
} from "../types";

// ── Create booking ────────────────────────────────────────────────────────────

export interface CreateBookingArgs {
  user: { uid: string; name: string; phone: string; email: string };
  payload: CreateBookingPayload;
  fare: number;
  distanceKm: number;
  durationMins?: number;
  fareRuleId?: string;
  bookingType: BookingType;
  estimatedDurationMins?: number;
}

export async function firestoreCreateBooking(
  args: CreateBookingArgs,
): Promise<Booking> {
  const {
    user,
    payload,
    fare,
    distanceKm,
    durationMins,
    fareRuleId,
    bookingType,
    estimatedDurationMins,
  } = args;

  const data = {
    userId: user.uid,
    userName: user.name,
    userPhone: user.phone,
    pickupLocation: payload.pickupLocation,
    pickupCoords: payload.pickupCoords,
    dropLocation: payload.dropLocation,
    dropCoords: payload.dropCoords,
    distance: distanceKm,
    duration: durationMins ? Math.round(durationMins / 60) : null,
    estimatedDurationMins: estimatedDurationMins ?? null,
    serviceType: payload.serviceType,
    serviceDetail: payload.serviceDetail ?? null,
    fare,
    finalFare: null, // set on completion
    fareRuleId: fareRuleId ?? null,
    bookingType,
    waitingSurcharge: null, // set on completion
    actualStartTime: null, // set on ongoing
    actualEndTime: null, // set on completed
    actualDurationMins: null, // set on completed
    status: "pending" as BookingStatus,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    createdAt: new Date().toISOString(),
    _serverTs: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "bookings"), data);

  return {
    id: ref.id,
    userId: user.uid,
    userName: user.name,
    userPhone: user.phone,
    pickupLocation: payload.pickupLocation,
    pickupCoords: payload.pickupCoords as LatLng,
    dropLocation: payload.dropLocation,
    dropCoords: payload.dropCoords as LatLng,
    distance: distanceKm,
    duration: durationMins ? Math.round(durationMins / 60) : undefined,
    estimatedDurationMins,
    serviceType: payload.serviceType,
    serviceDetail: payload.serviceDetail,
    fare,
    fareRuleId,
    bookingType,
    status: "pending",
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    createdAt: data.createdAt,
  };
}

// ── Update booking status (with time tracking + fare finalisation) ────────────

export async function firestoreUpdateStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<Partial<Booking>> {
  const now = new Date().toISOString();
  const bookRef = doc(db, "bookings", bookingId);

  // ── confirmed: booking accepted, no time logic yet ────────────────────────
  if (status === "confirmed") {
    await updateDoc(bookRef, {
      status,
      updatedAt: now,
      _serverTs: serverTimestamp(),
    });
    return { status };
  }

  // ── ongoing: driver has started the trip — timer begins ──────────────────
  if (status === "ongoing") {
    await updateDoc(bookRef, {
      status,
      actualStartTime: now,
      updatedAt: now,
      _serverTs: serverTimestamp(),
    });
    return { status, actualStartTime: now };
  }

  // ── completed: atomic transaction — prevents double-calculation ───────────
  // runTransaction makes the read + write a single atomic operation.
  // If two admins click Complete simultaneously, Firestore detects the
  // conflict, retries once, hits the idempotency guard, and returns the
  // already-written values — surcharge is never applied twice.
  if (status === "completed") {
    // Fetch policy outside the transaction — it's read-only and cached,
    // so it doesn't need to be part of the atomic read/write.
    let policy = null;
    try {
      policy = await getBookingPolicy();
    } catch {
      /* 0 surcharge on failure */
    }

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookRef);
      if (!snap.exists()) throw new Error("Booking not found");

      // Cast directly to Booking — all fields including actualStartTime,
      // actualEndTime, actualDurationMins, finalFare are on the interface.
      const booking = snap.data() as Booking;

      // Idempotency guard — already completed, return existing values
      if (booking.status === "completed") {
        return {
          status: "completed" as BookingStatus,
          actualEndTime: booking.actualEndTime,
          actualDurationMins: booking.actualDurationMins,
          waitingSurcharge: booking.waitingSurcharge ?? 0,
          finalFare: booking.finalFare ?? booking.fare,
        } as Partial<Booking>;
      }

      const actualEndTime = now;

      // Actual trip duration: timer started at ongoing → now
      let actualDurationMins = 0;
      if (booking.actualStartTime) {
        const startMs = new Date(booking.actualStartTime).getTime();
        const endMs = new Date(actualEndTime).getTime();
        actualDurationMins = Math.round((endMs - startMs) / 60_000);
      }

      // Surcharge applies to all Distance bookings (standard + immediate)
      const hasSurchargeLogic = booking.serviceType === "Distance";

      let waitingSurcharge = 0;
      if (hasSurchargeLogic && booking.estimatedDurationMins && policy) {
        const extraMins = Math.max(
          0,
          actualDurationMins - booking.estimatedDurationMins,
        );
        if (extraMins > 0) {
          waitingSurcharge = calculateWaitingSurcharge(extraMins, policy);
        }
      }

      const finalFare = booking.fare + waitingSurcharge;

      tx.update(bookRef, {
        status,
        actualEndTime,
        actualDurationMins,
        waitingSurcharge,
        finalFare,
        updatedAt: now,
        _serverTs: serverTimestamp(),
      });

      return {
        status,
        actualEndTime,
        actualDurationMins,
        waitingSurcharge,
        finalFare,
      } as Partial<Booking>;
    });

    return result;
  }

  // ── cancelled + any other transition ─────────────────────────────────────
  await updateDoc(bookRef, {
    status,
    updatedAt: now,
    _serverTs: serverTimestamp(),
  });
  return { status };
}

// ── Read bookings ─────────────────────────────────────────────────────────────

export async function firestoreGetUserBookings(
  uid: string,
): Promise<Booking[]> {
  const q = query(
    collection(db, "bookings"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking);
}

export async function firestoreGetAllBookings(
  pageSize: number = 200,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{ bookings: Booking[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy("createdAt", "desc"),
    limit(pageSize),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
  ];
  const snap = await getDocs(query(collection(db, "bookings"), ...constraints));
  return {
    bookings: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking),
    lastDoc:
      snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}

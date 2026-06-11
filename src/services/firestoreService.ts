// ─── src/services/firestoreService.ts ────────────────────────────────────────
// Status transition logic:
//
//   pending   → confirmed  : writes actualStartTime (trip clock starts)
//   confirmed → ongoing    : no time logic (driver en-route → arrived)
//   ongoing   → completed  : writes actualEndTime, computes actualDurationMins,
//                            calculates waitingSurcharge, writes finalFare
//   * → cancelled          : no time logic
//
// Surcharge rules (Distance + standard bookings only):
//   extraMins    = actualDurationMins - estimatedDurationMins
//   billable     = max(0, extraMins - freeWaitingMins)
//   blocks       = ceil(billable / waitingIntervalMins)
//   surcharge    = blocks × waitingChargePerInterval
//   finalFare    = originalFare + surcharge
//
// If estimatedDurationMins is missing (legacy booking), surcharge = 0.
// Surcharge is never applied to Hourly, Full Day, or Immediate bookings.
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
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
    actualStartTime: null, // set on confirmed
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

  // ── confirmed: no time logic — driver assigned, not yet started ─────────
  if (status === "confirmed") {
    await updateDoc(bookRef, {
      status,
      updatedAt: now,
      _serverTs: serverTimestamp(),
    });
    return { status };
  }

  // ── ongoing: driver has arrived, trip starts — record actualStartTime ────
  if (status === "ongoing") {
    const update = {
      status,
      actualStartTime: now,
      updatedAt: now,
      _serverTs: serverTimestamp(),
    };
    await updateDoc(bookRef, update);
    return { status, actualStartTime: now };
  }

  // ── completed: stop the clock, calculate surcharge, write finalFare ───────
  if (status === "completed") {
    // Read the current booking to get start time + fare details
    const snap = await getDoc(bookRef);
    if (!snap.exists()) throw new Error("Booking not found");

    const booking = snap.data() as Booking & {
      actualStartTime?: string;
      estimatedDurationMins?: number;
      bookingType?: BookingType;
      finalFare?: number;
    };

    const actualEndTime = now;

    // Calculate actual duration from actualStartTime → now
    let actualDurationMins = 0;
    if (booking.actualStartTime) {
      const startMs = new Date(booking.actualStartTime).getTime();
      const endMs = new Date(actualEndTime).getTime();
      actualDurationMins = Math.round((endMs - startMs) / 60_000);
    }

    // Determine if surcharge applies:
    // Only for standard Distance bookings — not Hourly, Full Day, or Immediate
    const isDistanceBooking = booking.serviceType === "Distance";
    const isStandardBooking = booking.bookingType === "standard";
    const hasSurchargeLogic = isDistanceBooking && isStandardBooking;

    let waitingSurcharge = 0;
    let finalFare = booking.fare;

    if (hasSurchargeLogic && booking.estimatedDurationMins) {
      const extraMins = Math.max(
        0,
        actualDurationMins - booking.estimatedDurationMins,
      );
      if (extraMins > 0) {
        try {
          const policy = await getBookingPolicy();
          waitingSurcharge = calculateWaitingSurcharge(extraMins, policy);
        } catch {
          // Policy fetch failed — default to 0 surcharge, don't block completion
          waitingSurcharge = 0;
        }
      }
    }

    finalFare = booking.fare + waitingSurcharge;

    const update = {
      status,
      actualEndTime,
      actualDurationMins,
      waitingSurcharge,
      finalFare,
      updatedAt: now,
      _serverTs: serverTimestamp(),
    };

    await updateDoc(bookRef, update);

    return {
      status,
      actualEndTime,
      actualDurationMins,
      waitingSurcharge,
      finalFare,
    } as Partial<Booking>;
  }

  // ── all other transitions (ongoing, cancelled) ────────────────────────────
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

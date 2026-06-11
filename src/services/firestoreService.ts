// ─── src/services/firestoreService.ts ────────────────────────────────────────
// Changes:
//   • CreateBookingArgs now accepts bookingType + estimatedDurationMins + fareRuleId
//   • Both are stored in Firestore and returned in the Booking object
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection,
  addDoc,
  getDocs,
  doc,
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
import type {
  Booking,
  BookingStatus,
  BookingType,
  CreateBookingPayload,
  LatLng,
} from "../types";

// ── Create booking ─────────────────────────────────────────────────────────────

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

  const bookingData = {
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
    fareRuleId: fareRuleId ?? null,
    bookingType,
    waitingSurcharge: null,
    status: "pending" as BookingStatus,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    createdAt: new Date().toISOString(),
    _serverTs: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "bookings"), bookingData);

  return {
    id: docRef.id,
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
    createdAt: bookingData.createdAt,
  };
}

// ── Read bookings ──────────────────────────────────────────────────────────────

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
  pageSize: number = 100,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{ bookings: Booking[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy("createdAt", "desc"),
    limit(pageSize),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
  ];
  const q = query(collection(db, "bookings"), ...constraints);
  const snap = await getDocs(q);
  return {
    bookings: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking),
    lastDoc:
      snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}

// ── Update status ──────────────────────────────────────────────────────────────

export async function firestoreUpdateStatus(
  id: string,
  status: BookingStatus,
): Promise<void> {
  await updateDoc(doc(db, "bookings", id), {
    status,
    updatedAt: new Date().toISOString(),
    _serverTs: serverTimestamp(),
  });
}

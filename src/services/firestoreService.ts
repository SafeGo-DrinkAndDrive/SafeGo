// ─── src/services/firestoreService.ts ────────────────────────────────────────
// Phase 3 changes:
//   • createBooking now accepts fareRuleId and stores it on the booking doc.
//   • All other logic unchanged.
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
  limit,
  startAfter,
  serverTimestamp,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db }   from '../firebase';
import type { Booking, BookingStatus, CreateBookingPayload, LatLng } from '../types';

// ── Create booking ─────────────────────────────────────────────────────────────

export interface CreateBookingArgs {
  user: { uid: string; name: string; phone: string; email: string };
  payload:      CreateBookingPayload;
  fare:         number;
  distanceKm:   number;
  durationMins?: number;
  fareRuleId?:  string;   // Phase 3: which Firestore rule was used
}

export async function firestoreCreateBooking(args: CreateBookingArgs): Promise<Booking> {
  const { user, payload, fare, distanceKm, durationMins, fareRuleId } = args;

  const bookingData = {
    userId:         user.uid,
    userName:       user.name,
    userPhone:      user.phone,
    pickupLocation: payload.pickupLocation,
    pickupCoords:   payload.pickupCoords,
    dropLocation:   payload.dropLocation,
    dropCoords:     payload.dropCoords,
    distance:       distanceKm,
    duration:       durationMins ? Math.round(durationMins / 60) : null,
    serviceType:    payload.serviceType,
    serviceDetail:  payload.serviceDetail ?? null,
    fare,
    fareRuleId:     fareRuleId ?? null,
    status:         'pending' as BookingStatus,
    scheduledDate:  payload.scheduledDate,
    scheduledTime:  payload.scheduledTime,
    createdAt:      new Date().toISOString(),
    _serverTs:      serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'bookings'), bookingData);

  return {
    id:             docRef.id,
    userId:         user.uid,
    userName:       user.name,
    userPhone:      user.phone,
    pickupLocation: payload.pickupLocation,
    pickupCoords:   payload.pickupCoords as LatLng,
    dropLocation:   payload.dropLocation,
    dropCoords:     payload.dropCoords as LatLng,
    distance:       distanceKm,
    duration:       durationMins ? Math.round(durationMins / 60) : undefined,
    serviceType:    payload.serviceType,
    serviceDetail:  payload.serviceDetail,
    fare,
    fareRuleId,
    status:         'pending',
    scheduledDate:  payload.scheduledDate,
    scheduledTime:  payload.scheduledTime,
    createdAt:      bookingData.createdAt,
  };
}

// ── Read bookings ─────────────────────────────────────────────────────────────

export async function firestoreGetUserBookings(uid: string): Promise<Booking[]> {
  const q    = query(
    collection(db, 'bookings'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

/**
 * Admin: paginated booking fetch.
 * Pass a lastDoc cursor for subsequent pages (returns at most `pageSize` docs).
 */
export async function firestoreGetAllBookings(
  pageSize:  number = 100,
  lastDoc?:  QueryDocumentSnapshot,
): Promise<{ bookings: Booking[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy('createdAt', 'desc'),
    limit(pageSize),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
  ];

  const q    = query(collection(db, 'bookings'), ...constraints);
  const snap = await getDocs(q);

  return {
    bookings: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)),
    lastDoc:  snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}

// ── Update booking status ─────────────────────────────────────────────────────

export async function firestoreUpdateStatus(
  id:     string,
  status: BookingStatus,
): Promise<void> {
  await updateDoc(doc(db, 'bookings', id), {
    status,
    updatedAt:  new Date().toISOString(),
    _serverTs:  serverTimestamp(),
  });
}

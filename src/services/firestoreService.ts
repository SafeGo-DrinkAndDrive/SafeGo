// ─── src/services/firestoreService.ts ────────────────────────────────────────
// Direct Firestore operations for bookings — no backend required.
// The Express backend is still used in production for security,
// but this service lets the app work fully without it running locally.
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
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Booking, BookingStatus, CreateBookingPayload, LatLng } from '../types';

// ── Create booking ─────────────────────────────────────────────────────────────

export interface CreateBookingArgs {
  user: { uid: string; name: string; phone: string; email: string };
  payload: CreateBookingPayload;
  fare:        number;
  distanceKm:  number;
  durationMins?: number;
}

export async function firestoreCreateBooking(args: CreateBookingArgs): Promise<Booking> {
  const { user, payload, fare, distanceKm, durationMins } = args;

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
    status:         'pending',
    scheduledDate:  payload.scheduledDate,
    scheduledTime:  payload.scheduledTime,
    createdAt:      new Date().toISOString(),
  };
}

// ── List user bookings ─────────────────────────────────────────────────────────

export async function firestoreGetUserBookings(uid: string): Promise<Booking[]> {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

// ── List all bookings (admin) ─────────────────────────────────────────────────

export async function firestoreGetAllBookings(): Promise<Booking[]> {
  const q = query(
    collection(db, 'bookings'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

// ── Update booking status ─────────────────────────────────────────────────────

export async function firestoreUpdateStatus(
  id:     string,
  status: BookingStatus,
): Promise<void> {
  await updateDoc(doc(db, 'bookings', id), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

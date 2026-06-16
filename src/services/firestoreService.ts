// ─── src/services/firestoreService.ts ────────────────────────────────────────
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, deleteDoc, query, where,
  runTransaction, orderBy, serverTimestamp,
  limit, startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getBookingPolicy, calculateWaitingSurcharge } from './bookingPolicyService';
import { sendBookingConfirmationEmails, sendRideCompletionEmail } from './emailService';
import type { Booking, BookingStatus, BookingType, CreateBookingPayload, LatLng } from '../types';

// ── Create booking ────────────────────────────────────────────────────────────

export interface CreateBookingArgs {
  user: { uid: string; name: string; phone: string; email: string };
  payload:                CreateBookingPayload;
  fare:                   number;
  distanceKm:             number;
  durationMins?:          number;
  fareRuleId?:            string;
  bookingType:            BookingType;
  estimatedDurationMins?: number;
}

export async function firestoreCreateBooking(args: CreateBookingArgs): Promise<Booking> {
  const { user, payload, fare, distanceKm, durationMins, fareRuleId, bookingType, estimatedDurationMins } = args;

  const data = {
    userId:               user.uid,
    userName:             user.name,
    userPhone:            user.phone,
    pickupLocation:       payload.pickupLocation,
    pickupCoords:         payload.pickupCoords,
    dropLocation:         payload.dropLocation,
    dropCoords:           payload.dropCoords,
    distance:             distanceKm,
    duration:             durationMins ? Math.round(durationMins / 60) : null,
    estimatedDurationMins: estimatedDurationMins ?? null,
    serviceType:          payload.serviceType,
    serviceDetail:        payload.serviceDetail ?? null,
    fare,
    finalFare:            null,
    fareRuleId:           fareRuleId ?? null,
    bookingType,
    waitingSurcharge:     null,
    actualStartTime:      null,
    actualEndTime:        null,
    actualDurationMins:   null,
    status:               'pending' as BookingStatus,
    scheduledDate:        payload.scheduledDate,
    scheduledTime:        payload.scheduledTime,
    createdAt:            new Date().toISOString(),
    _serverTs:            serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'bookings'), data);

  const booking: Booking = {
    id:                   ref.id,
    userId:               user.uid,
    userName:             user.name,
    userPhone:            user.phone,
    pickupLocation:       payload.pickupLocation,
    pickupCoords:         payload.pickupCoords as LatLng,
    dropLocation:         payload.dropLocation,
    dropCoords:           payload.dropCoords   as LatLng,
    distance:             distanceKm,
    duration:             durationMins ? Math.round(durationMins / 60) : undefined,
    estimatedDurationMins,
    serviceType:          payload.serviceType,
    serviceDetail:        payload.serviceDetail,
    fare,
    fareRuleId,
    bookingType,
    status:               'pending',
    scheduledDate:        payload.scheduledDate,
    scheduledTime:        payload.scheduledTime,
    createdAt:            data.createdAt,
  };

  if (user.email) {
    sendBookingConfirmationEmails(booking, user.email).catch(() => {});
  }

  return booking;
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function firestoreUpdateStatus(
  bookingId:  string,
  status:     BookingStatus,
  userEmail?: string,
): Promise<Partial<Booking>> {
  const now     = new Date().toISOString();
  const bookRef = doc(db, 'bookings', bookingId);

  if (status === 'confirmed') {
    await updateDoc(bookRef, { status, updatedAt: now, _serverTs: serverTimestamp() });
    return { status };
  }

  if (status === 'ongoing') {
    await updateDoc(bookRef, { status, actualStartTime: now, updatedAt: now, _serverTs: serverTimestamp() });
    return { status, actualStartTime: now };
  }

  if (status === 'completed') {
    let policy = null;
    try { policy = await getBookingPolicy(); } catch { /* 0 surcharge */ }

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookRef);
      if (!snap.exists()) throw new Error('Booking not found');
      const booking = snap.data() as Booking;

      if (booking.status === 'completed') {
        return {
          status:             'completed'             as BookingStatus,
          actualEndTime:      booking.actualEndTime,
          actualDurationMins: booking.actualDurationMins,
          waitingSurcharge:   booking.waitingSurcharge  ?? 0,
          finalFare:          booking.finalFare          ?? booking.fare,
        } as Partial<Booking>;
      }

      const actualEndTime = now;
      let actualDurationMins = 0;
      if (booking.actualStartTime) {
        actualDurationMins = Math.round(
          (new Date(actualEndTime).getTime() - new Date(booking.actualStartTime).getTime()) / 60_000,
        );
      }

      let waitingSurcharge = 0;
      if (booking.serviceType === 'Distance' && booking.estimatedDurationMins && policy) {
        const extraMins = Math.max(0, actualDurationMins - booking.estimatedDurationMins);
        if (extraMins > 0) {
          waitingSurcharge = calculateWaitingSurcharge(extraMins, policy);
        }
      }

      const finalFare = booking.fare + waitingSurcharge;

      tx.update(bookRef, {
        status, actualEndTime, actualDurationMins,
        waitingSurcharge, finalFare,
        updatedAt: now, _serverTs: serverTimestamp(),
      });

      return { status, actualEndTime, actualDurationMins, waitingSurcharge, finalFare } as Partial<Booking>;
    });

    if (userEmail) {
      getDoc(bookRef).then((snap) => {
        if (snap.exists()) {
          sendRideCompletionEmail({ id: bookingId, ...snap.data() } as Booking, userEmail).catch(() => {});
        }
      }).catch(() => {});
    }

    return result;
  }

  await updateDoc(bookRef, { status, updatedAt: now, _serverTs: serverTimestamp() });
  return { status };
}

// ── Delete booking ────────────────────────────────────────────────────────────

export async function firestoreDeleteBooking(bookingId: string): Promise<void> {
  await deleteDoc(doc(db, 'bookings', bookingId));
}

// ── Read bookings ─────────────────────────────────────────────────────────────

export async function firestoreGetUserBookings(uid: string): Promise<Booking[]> {
  const snap = await getDocs(
    query(collection(db, 'bookings'), where('userId', '==', uid), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

export async function firestoreGetAllBookings(
  pageSize: number = 200,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{ bookings: Booking[]; lastDoc: QueryDocumentSnapshot | null }> {
  const constraints = [
    orderBy('createdAt', 'desc'),
    limit(pageSize),
    ...(lastDoc ? [startAfter(lastDoc)] : []),
  ];
  const snap = await getDocs(query(collection(db, 'bookings'), ...constraints));
  return {
    bookings: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)),
    lastDoc:  snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}
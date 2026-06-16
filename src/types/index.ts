// ─── src/hooks/useAdmin.ts ────────────────────────────────────────────────────
// Changes:
//   • updateStatus passes userEmail to firestoreUpdateStatus so the
//     completion email can be sent after a ride is finalised
//   • deleteBooking: removes booking from Firestore + local state instantly
//     (revenue recalculates automatically since it's derived from the array)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import {
  firestoreGetAllBookings,
  firestoreUpdateStatus,
  firestoreDeleteBooking,
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import type { Booking, AppUser, BookingStatus } from '../types';

export function useAdmin() {
  const { isAdmin } = useAuth();
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [users,     setUsers]     = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

    Promise.all([
      firestoreGetAllBookings(),
      getDocs(usersQuery).then((snap) =>
        snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser))
      ),
    ])
      .then(([{ bookings: b }, u]) => {
        if (!cancelled) { setBookings(b); setUsers(u); }
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [isAdmin, tick]);

  // updateStatus — finds user email from users array so completion email can be sent
  const updateStatus = async (id: string, status: BookingStatus): Promise<void> => {
    const booking   = bookings.find((b) => b.id === id);
    const userEmail = users.find((u) => u.uid === booking?.userId)?.email;

    const changes = await firestoreUpdateStatus(id, status, userEmail);
    setBookings((prev) =>
      prev.map((b) => b.id === id ? { ...b, ...changes } : b)
    );
  };

  // deleteBooking — removes from Firestore + local state
  // Revenue recalculates automatically because it's derived from the bookings array
  const deleteBooking = async (id: string): Promise<void> => {
    await firestoreDeleteBooking(id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return { bookings, users, isLoading, error, updateStatus, deleteBooking, refresh };
}
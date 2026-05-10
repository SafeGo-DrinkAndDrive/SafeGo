// ─── src/hooks/useAdmin.ts ────────────────────────────────────────────────────
// Loads all bookings + users from Firestore directly (no backend needed).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { firestoreGetAllBookings, firestoreUpdateStatus } from '../services/firestoreService';
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
      .then(([b, u]) => {
        if (!cancelled) { setBookings(b); setUsers(u); }
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [isAdmin, tick]);

  const updateStatus = async (id: string, status: BookingStatus) => {
    await firestoreUpdateStatus(id, status);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
  };

  return { bookings, users, isLoading, error, updateStatus, refresh };
}

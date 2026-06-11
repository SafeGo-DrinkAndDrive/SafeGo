// ─── src/hooks/useBookings.ts ─────────────────────────────────────────────────
// Change: createBooking now accepts bookingType + estimatedDurationMins + fareRuleId
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import {
  firestoreCreateBooking,
  firestoreGetUserBookings,
  firestoreUpdateStatus,
  type CreateBookingArgs,
} from "../services/firestoreService";
import { useAuth } from "../contexts/AuthContext";
import type {
  Booking,
  BookingStatus,
  BookingType,
  CreateBookingPayload,
} from "../types";

interface UseBookingsReturn {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  createBooking: (
    payload: CreateBookingPayload,
    fare: number,
    distanceKm: number,
    durationMins?: number,
    fareRuleId?: string,
    bookingType?: BookingType,
    estimatedDurationMins?: number,
  ) => Promise<Booking>;
  updateStatus: (id: string, status: BookingStatus) => Promise<void>;
  refresh: () => void;
}

export function useBookings(): UseBookingsReturn {
  const { user, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    firestoreGetUserBookings(user.uid)
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, tick]);

  const createBooking = async (
    payload: CreateBookingPayload,
    fare: number,
    distanceKm: number,
    durationMins?: number,
    fareRuleId?: string,
    bookingType: BookingType = "standard",
    estimatedDurationMins?: number,
  ): Promise<Booking> => {
    if (!user) throw new Error("Not authenticated");

    const args: CreateBookingArgs = {
      user: {
        uid: user.uid,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
      payload,
      fare,
      distanceKm,
      durationMins,
      fareRuleId,
      bookingType,
      estimatedDurationMins,
    };

    const booking = await firestoreCreateBooking(args);
    setBookings((prev) => [booking, ...prev]);
    return booking;
  };

  const updateStatus = async (
    id: string,
    status: BookingStatus,
  ): Promise<void> => {
    await firestoreUpdateStatus(id, status);
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    );
  };

  return { bookings, isLoading, error, createBooking, updateStatus, refresh };
}

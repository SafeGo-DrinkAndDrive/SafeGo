// ─── src/services/api.ts ──────────────────────────────────────────────────────
// Typed HTTP client for the SafeGo Express backend.
//
// Every request automatically attaches the Firebase ID token as a
// Bearer header.  Token is read from the AuthContext via a module-level
// getter to avoid prop-drilling into every service function.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Booking,
  CreateBookingPayload,
  UpdateStatusPayload,
  FareEstimate,
  AppUser,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// ── Token accessor ────────────────────────────────────────────────────────────
// The AuthContext calls setToken() whenever the ID token changes so every
// subsequent API call picks up the latest value without re-renders.

let _token: string | null = null;
export const setApiToken = (token: string | null) => { _token = token; };

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path:    string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as { message?: string }).message ?? `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export const BookingsAPI = {
  /** Create a booking — returns saved booking with server-calculated fare. */
  create: (payload: CreateBookingPayload): Promise<Booking> =>
    apiFetch<Booking>('/api/bookings', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  /** Fetch bookings. Users get their own; admins get all. */
  list: (): Promise<Booking[]> =>
    apiFetch<Booking[]>('/api/bookings'),

  /** Estimate fare before booking (no write). */
  estimate: (payload: Pick<CreateBookingPayload, 'pickupCoords' | 'dropCoords' | 'serviceType' | 'serviceDetail'>): Promise<FareEstimate> =>
    apiFetch<FareEstimate>('/api/bookings/estimate', {
      method: 'POST',
      body:   JSON.stringify(payload),
    }),

  /** Update booking status (admin only for most transitions). */
  updateStatus: (id: string, payload: UpdateStatusPayload): Promise<Booking> =>
    apiFetch<Booking>(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify(payload),
    }),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const UsersAPI = {
  /** Admin: fetch all users. */
  list: (): Promise<AppUser[]> =>
    apiFetch<AppUser[]>('/api/users'),

  /** Get own profile. */
  me: (): Promise<AppUser> =>
    apiFetch<AppUser>('/api/users/me'),
};

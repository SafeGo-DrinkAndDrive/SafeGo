// ─── src/services/bookingPolicyService.ts ────────────────────────────────────
// All booking-policy business logic in one place.
// Fetches admin-configurable rules from Firestore /appSettings/bookingPolicy.
// Falls back to DEFAULT_BOOKING_POLICY if no document exists yet.
// ─────────────────────────────────────────────────────────────────────────────
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_BOOKING_POLICY } from "../types";
import type { BookingPolicy, BookingType } from "../types";

// ── Cache ─────────────────────────────────────────────────────────────────────

const TTL = 5 * 60 * 1000; // 5 minutes
let _cache: BookingPolicy | null = null;
let _cacheAt: number = 0;

export function clearPolicyCache() {
  _cache = null;
  _cacheAt = 0;
}

// ── Firestore ─────────────────────────────────────────────────────────────────

export async function getBookingPolicy(): Promise<BookingPolicy> {
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  try {
    const snap = await getDoc(doc(db, "appSettings", "bookingPolicy"));
    if (snap.exists()) {
      _cache = snap.data() as BookingPolicy;
      _cacheAt = Date.now();
      return _cache;
    }
  } catch {
    /* network error – use defaults */
  }

  return {
    ...DEFAULT_BOOKING_POLICY,
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
}

export async function saveBookingPolicy(
  policy: Omit<BookingPolicy, "updatedAt" | "updatedBy">,
  adminUid: string,
): Promise<void> {
  const full: BookingPolicy = {
    ...policy,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid,
  };
  await setDoc(doc(db, "appSettings", "bookingPolicy"), {
    ...full,
    _serverTs: serverTimestamp(),
  });
  _cache = full;
  _cacheAt = Date.now();
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Parse YYYY-MM-DD + HH:MM into a local Date without the UTC midnight bug.
 */
export function parseScheduledDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function getMinutesUntilPickup(date: string, time: string): number {
  if (!date || !time) return Infinity;
  return (parseScheduledDateTime(date, time).getTime() - Date.now()) / 60_000;
}

export type TimeClassification = "standard" | "immediate" | "blocked";

/**
 * Classify pickup time relative to now:
 *   blocked   → < minAdvanceMins
 *   immediate → between minAdvanceMins and immediateThresholdMins
 *   standard  → ≥ immediateThresholdMins
 */
export function classifyBookingTime(
  date: string,
  time: string,
  policy: BookingPolicy,
): TimeClassification {
  const mins = getMinutesUntilPickup(date, time);
  if (mins < policy.minAdvanceMins) return "blocked";
  if (mins < policy.immediateThresholdMins) return "immediate";
  return "standard";
}

export function toBookingType(cls: TimeClassification): BookingType {
  return cls === "immediate" ? "immediate" : "standard";
}

// ── Surcharge calculator ──────────────────────────────────────────────────────

/**
 * Calculate waiting surcharge for extra minutes beyond estimate.
 *
 * billableMinutes = max(0, extraMinutes − freeWaitingMins)
 * blocks          = ceil(billableMinutes / waitingIntervalMins)
 * surcharge       = blocks × waitingChargePerInterval
 */
export function calculateWaitingSurcharge(
  extraMins: number,
  policy: BookingPolicy,
): number {
  const billable = Math.max(0, extraMins - policy.freeWaitingMins);
  if (billable <= 0) return 0;
  const blocks = Math.ceil(billable / policy.waitingIntervalMins);
  return blocks * policy.waitingChargePerInterval;
}

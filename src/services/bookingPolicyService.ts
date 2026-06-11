// ─── src/services/bookingPolicyService.ts ────────────────────────────────────
// Change: immediateBaseFare removed from BookingPolicy.
// Immediate pricing is now managed entirely through the Firestore
// /fareRules collection using serviceType == 'Immediate Distance'.
// This file only handles booking TIME window rules and waiting surcharges.
// ─────────────────────────────────────────────────────────────────────────────
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_BOOKING_POLICY } from "../types";
import type { BookingPolicy, BookingType } from "../types";

const TTL = 5 * 60 * 1000;
let _cache: BookingPolicy | null = null;
let _cacheAt: number = 0;

export function clearPolicyCache() {
  _cache = null;
  _cacheAt = 0;
}

export async function getBookingPolicy(): Promise<BookingPolicy> {
  if (_cache && Date.now() - _cacheAt < TTL) return _cache;
  try {
    const snap = await getDoc(doc(db, "appSettings", "bookingPolicy"));
    if (snap.exists()) {
      const data = snap.data() as BookingPolicy;
      _cache = {
        ...data,
        hourlySlots: data.hourlySlots ?? DEFAULT_BOOKING_POLICY.hourlySlots,
        fullDaySlots: data.fullDaySlots ?? DEFAULT_BOOKING_POLICY.fullDaySlots,
      };
      _cacheAt = Date.now();
      return _cache;
    }
  } catch {
    /* fallthrough */
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

export function calculateWaitingSurcharge(
  extraMins: number,
  policy: BookingPolicy,
): number {
  const billable = Math.max(0, extraMins - policy.freeWaitingMins);
  if (billable <= 0) return 0;
  return (
    Math.ceil(billable / policy.waitingIntervalMins) *
    policy.waitingChargePerInterval
  );
}

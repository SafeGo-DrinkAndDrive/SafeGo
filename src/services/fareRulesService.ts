// ─── src/services/fareRulesService.ts ────────────────────────────────────────
// Phase 3: Dynamic Fare Management
//
// This service replaces all hardcoded pricing logic in the app.
//
// Public API:
//   getActiveFareRule(serviceType)      — fetch the active rule for a service type
//   calculateDynamicFare(...)           — compute fare using active Firestore rule
//   getAllFareRules()                    — admin: list all rules
//   createFareRule(data)                — admin: create a new rule
//   updateFareRule(id, data)            — admin: edit a rule
//   setActiveRule(id, serviceType)      — admin: activate a rule (deactivates others)
//   deleteFareRule(id)                  — admin: soft-delete a rule
//
// Caching:
//   Active rules are cached in memory for 5 minutes so the booking page
//   doesn't hit Firestore on every keystroke while typing an address.
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db }         from '../firebase';
import type { FareRule, FarePricingResult, ServiceType, LatLng } from '../types';

// ── In-memory cache ───────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;   // 5 minutes

const cache: Partial<Record<ServiceType, { rule: FareRule; expiresAt: number }>> = {};

function getCached(serviceType: ServiceType): FareRule | null {
  const entry = cache[serviceType];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete cache[serviceType];
    return null;
  }
  return entry.rule;
}

function setCache(serviceType: ServiceType, rule: FareRule): void {
  cache[serviceType] = { rule, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function clearFareRuleCache(): void {
  (Object.keys(cache) as ServiceType[]).forEach((k) => delete cache[k]);
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

const RULES_COL = 'fareRules';

function docToFareRule(id: string, data: Record<string, unknown>): FareRule {
  return {
    id,
    name:        data.name        as string,
    serviceType: data.serviceType as ServiceType,
    isActive:    data.isActive    as boolean,
    description: (data.description as string) ?? '',
    tiers:       (data.tiers       as FareRule['tiers'])     ?? undefined,
    flatRates:   (data.flatRates   as FareRule['flatRates']) ?? undefined,
    createdAt:   data.createdAt   as string,
    updatedAt:   data.updatedAt   as string,
    createdBy:   data.createdBy   as string,
  };
}

// ── Read helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch the single active rule for a service type.
 * Returns null if no active rule exists (fare preview will show "unavailable").
 */
export async function getActiveFareRule(
  serviceType: ServiceType,
): Promise<FareRule | null> {
  const cached = getCached(serviceType);
  if (cached) return cached;

  const q    = query(
    collection(db, RULES_COL),
    where('serviceType', '==', serviceType),
    where('isActive',    '==', true),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  // Safety: take the first active rule if somehow multiple exist
  const firstDoc = snap.docs[0];
  const rule     = docToFareRule(firstDoc.id, firstDoc.data() as Record<string, unknown>);
  setCache(serviceType, rule);
  return rule;
}

/** Admin: list all fare rules, newest first. */
export async function getAllFareRules(): Promise<FareRule[]> {
  const q    = query(collection(db, RULES_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToFareRule(d.id, d.data() as Record<string, unknown>));
}

/** Get a single rule by ID. */
export async function getFareRuleById(id: string): Promise<FareRule | null> {
  const snap = await getDoc(doc(db, RULES_COL, id));
  if (!snap.exists()) return null;
  return docToFareRule(snap.id, snap.data() as Record<string, unknown>);
}

// ── Write helpers (admin only — Firestore rules enforce this) ─────────────────

export type CreateFareRulePayload = Omit<FareRule, 'id' | 'createdAt' | 'updatedAt'>;

/** Create a new fare rule. Does NOT auto-activate it. */
export async function createFareRule(
  payload:  CreateFareRulePayload,
  adminUid: string,
): Promise<FareRule> {
  const now      = new Date().toISOString();
  const docData  = {
    ...payload,
    createdBy:  adminUid,
    createdAt:  now,
    updatedAt:  now,
    _serverTs:  serverTimestamp(),
  };
  const ref  = await addDoc(collection(db, RULES_COL), docData);
  clearFareRuleCache();
  return { id: ref.id, ...payload, createdAt: now, updatedAt: now, createdBy: adminUid };
}

/** Update an existing rule's fields. Bumps updatedAt. */
export async function updateFareRule(
  id:      string,
  changes: Partial<Omit<FareRule, 'id' | 'createdAt' | 'createdBy'>>,
): Promise<void> {
  await updateDoc(doc(db, RULES_COL, id), {
    ...changes,
    updatedAt: new Date().toISOString(),
    _serverTs: serverTimestamp(),
  });
  clearFareRuleCache();
}

/**
 * Activate a rule for its service type.
 * Uses a batch write to atomically deactivate all other rules of the same
 * service type, then activate the chosen one — avoids a race condition where
 * two rules are briefly both active.
 */
export async function setActiveRule(
  ruleId:      string,
  serviceType: ServiceType,
): Promise<void> {
  const q    = query(
    collection(db, RULES_COL),
    where('serviceType', '==', serviceType),
    where('isActive',    '==', true),
  );
  const snap   = await getDocs(q);
  const batch  = writeBatch(db);
  const now    = new Date().toISOString();

  // Deactivate all currently active rules for this service type
  snap.docs.forEach((d) => {
    if (d.id !== ruleId) {
      batch.update(d.ref, { isActive: false, updatedAt: now });
    }
  });

  // Activate the chosen rule
  batch.update(doc(db, RULES_COL, ruleId), { isActive: true, updatedAt: now });

  await batch.commit();
  clearFareRuleCache();
}

/** Soft-disable a rule (sets isActive: false). Preserves history. */
export async function disableFareRule(id: string): Promise<void> {
  await updateFareRule(id, { isActive: false });
}

// ── Dynamic fare calculator ───────────────────────────────────────────────────

/**
 * Google Maps Distance Matrix — same approach as the old fareService.ts
 * but now returns raw km/duration only; pricing is looked up from Firestore.
 */
function waitForMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof google !== 'undefined' && google.maps) { resolve(); return; }
    const iv = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps) { clearInterval(iv); resolve(); }
    }, 100);
  });
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R    = 6371;
  const toR  = (d: number) => d * (Math.PI / 180);
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const s    = Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function getRealDistanceKm(
  origin:      LatLng,
  destination: LatLng,
): Promise<{ distanceKm: number; durationMins: number }> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    const km = haversineKm(origin, destination) * 1.35;
    return { distanceKm: Math.round(km * 10) / 10, durationMins: Math.round(km * 2) };
  }

  await waitForMaps();

  return new Promise((resolve, reject) => {
    const svc = new google.maps.DistanceMatrixService();
    svc.getDistanceMatrix(
      {
        origins:      [new google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
        travelMode:   google.maps.TravelMode.DRIVING,
        unitSystem:   google.maps.UnitSystem.METRIC,
      },
      (result, status) => {
        if (status !== 'OK' || !result) { reject(new Error(`Maps error: ${status}`)); return; }
        const el = result.rows[0]?.elements[0];
        if (!el || el.status !== 'OK') { reject(new Error('Route not found')); return; }
        resolve({
          distanceKm:   Math.round((el.distance.value / 1000) * 10) / 10,
          durationMins: Math.round(el.duration.value / 60),
        });
      },
    );
  });
}

/**
 * Apply tiered pricing to a distance.
 *
 * Example tiers: [
 *   { minKm: 0,  maxKm: 10, baseCharge: 500, ratePerKm: 100 },
 *   { minKm: 10, maxKm: 20, baseCharge: 0,   ratePerKm:  80 },
 *   { minKm: 20, maxKm: 9999, baseCharge: 0, ratePerKm:  60 },
 * ]
 *
 * The algorithm applies the rate of the tier the total distance falls into,
 * not a cumulative split — simpler for the admin to reason about.
 */
function applyTieredPricing(
  distanceKm: number,
  tiers: NonNullable<FareRule['tiers']>,
): { baseCharge: number; distanceCharge: number; ratePerKm: number; tierUsed: string } {
  const sorted = [...tiers].sort((a, b) => a.minKm - b.minKm);

  // Find the tier the total distance falls into
  const tier = sorted.findLast((t) => distanceKm >= t.minKm) ?? sorted[0];

  const distanceCharge = Math.round(distanceKm * tier.ratePerKm);
  const maxLabel       = tier.maxKm >= 9999 ? '∞' : `${tier.maxKm}`;
  const tierUsed       = `${tier.minKm}–${maxLabel} km @ LKR ${tier.ratePerKm}/km`;

  return {
    baseCharge:     tier.baseCharge,
    distanceCharge,
    ratePerKm:      tier.ratePerKm,
    tierUsed,
  };
}

/**
 * Main public function — calculate the fare for a Distance booking
 * using the active Firestore rule.
 *
 * Falls back to a hardcoded default (LKR 150/km, LKR 500 base) if no
 * active rule exists, so the booking page never completely breaks.
 */
export async function calculateDynamicFare(
  origin:      LatLng,
  destination: LatLng,
): Promise<FarePricingResult> {
  const [{ distanceKm, durationMins }, rule] = await Promise.all([
    getRealDistanceKm(origin, destination),
    getActiveFareRule('Distance'),
  ]);

  // ── No rule configured — use safe fallback ────────────────────────────────
  if (!rule || !rule.tiers?.length) {
    const ratePerKm      = 150;
    const baseCharge     = 500;
    const distanceCharge = Math.round(distanceKm * ratePerKm);
    const total          = baseCharge + distanceCharge;
    return {
      fare: total,
      distanceKm,
      durationMins,
      fareRuleId:   'fallback',
      fareRuleName: 'Default Rate (no rule configured)',
      breakdown: {
        baseCharge,
        distanceCharge,
        ratePerKm,
        tierUsed:  `Fallback: LKR ${ratePerKm}/km`,
        total,
      },
    };
  }

  // ── Apply tiered pricing ──────────────────────────────────────────────────
  const { baseCharge, distanceCharge, ratePerKm, tierUsed } =
    applyTieredPricing(distanceKm, rule.tiers);

  const total = baseCharge + distanceCharge;

  return {
    fare:         total,
    distanceKm,
    durationMins,
    fareRuleId:   rule.id,
    fareRuleName: rule.name,
    breakdown: {
      baseCharge,
      distanceCharge,
      ratePerKm,
      tierUsed,
      total,
    },
  };
}

/**
 * Flat fare for Hourly / Full Day bookings — looks up the active rule's
 * flatRates map, falls back to safe defaults.
 */
export async function calculateFlatFareDynamic(
  serviceType: 'Hourly' | 'Full Day',
  detail:      string,   // e.g. '2h', '6h'
): Promise<FarePricingResult> {
  const rule = await getActiveFareRule(serviceType);

  const fallbackHourly:  Record<string, number> = { '1h': 2500, '2h': 3500, '3h': 4500, '4h': 5500, '6h': 7000, '12h': 12000 };
  const fallbackFullDay: Record<string, number> = { '4h': 5000, '6h': 7000, '8h': 9000, '10h': 11000, '12h': 13000 };

  const rates    = rule?.flatRates ?? (serviceType === 'Hourly' ? fallbackHourly : fallbackFullDay);
  const fare     = rates[detail] ?? Object.values(rates)[0] ?? 0;
  const hrs      = parseInt(detail, 10);

  return {
    fare,
    distanceKm:   0,
    durationMins: hrs * 60,
    fareRuleId:   rule?.id   ?? 'fallback',
    fareRuleName: rule?.name ?? 'Default Rate',
    breakdown: {
      baseCharge:     fare,
      distanceCharge: 0,
      ratePerKm:      0,
      total:          fare,
    },
  };
}

/** Reverse geocode coords → human-readable address string. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  await waitForMaps();
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) resolve(results[0].formatted_address);
      else reject(new Error(`Geocoding failed: ${status}`));
    });
  });
}

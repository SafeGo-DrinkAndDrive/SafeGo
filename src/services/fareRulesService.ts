// ─── src/services/fareRulesService.ts ────────────────────────────────────────
// Two completely separate fare engines:
//
//   calculateDynamicFare()    → Standard Distance bookings
//                               reads /fareRules where serviceType == 'Distance'
//
//   calculateImmediateFare()  → Immediate Distance bookings
//                               reads /fareRules where serviceType == 'Immediate Distance'
//
// Each engine has its own Firestore query, its own cache key, its own
// result type, and returns independently. Neither depends on the other.
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
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  FareRule,
  FareRuleTier,
  FarePricingResult,
  ImmediateFareResult,
  FareRuleServiceType,
  LatLng,
} from "../types";

// ── Per-serviceType in-memory cache ──────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;

const _cache: Partial<
  Record<FareRuleServiceType, { rule: FareRule; at: number }>
> = {};

function getCached(st: FareRuleServiceType): FareRule | null {
  const e = _cache[st];
  if (!e || Date.now() > e.at + CACHE_TTL_MS) {
    delete _cache[st];
    return null;
  }
  return e.rule;
}
function setCache(st: FareRuleServiceType, rule: FareRule) {
  _cache[st] = { rule, at: Date.now() };
}
export function clearFareRuleCache() {
  (Object.keys(_cache) as FareRuleServiceType[]).forEach(
    (k) => delete _cache[k],
  );
}

// ── Firestore CRUD (used by AdminFareManager) ─────────────────────────────────

const COL = "fareRules";

function docToRule(id: string, data: Record<string, unknown>): FareRule {
  return {
    id,
    name: data.name as string,
    serviceType: data.serviceType as FareRuleServiceType,
    isActive: data.isActive as boolean,
    description: (data.description as string) ?? "",
    tiers: data.tiers as FareRule["tiers"],
    flatRates: data.flatRates as FareRule["flatRates"],
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    createdBy: data.createdBy as string,
  };
}

export async function getActiveFareRule(
  st: FareRuleServiceType,
): Promise<FareRule | null> {
  const cached = getCached(st);
  if (cached) return cached;

  const q = query(
    collection(db, COL),
    where("serviceType", "==", st),
    where("isActive", "==", true),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const rule = docToRule(
    snap.docs[0].id,
    snap.docs[0].data() as Record<string, unknown>,
  );
  setCache(st, rule);
  return rule;
}

export async function getAllFareRules(): Promise<FareRule[]> {
  const snap = await getDocs(
    query(collection(db, COL), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) =>
    docToRule(d.id, d.data() as Record<string, unknown>),
  );
}

export async function getFareRuleById(id: string): Promise<FareRule | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return docToRule(snap.id, snap.data() as Record<string, unknown>);
}

export type CreateFareRulePayload = Omit<
  FareRule,
  "id" | "createdAt" | "updatedAt"
>;

export async function createFareRule(
  p: CreateFareRulePayload,
  adminUid: string,
): Promise<FareRule> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, COL), {
    ...p,
    createdBy: adminUid,
    createdAt: now,
    updatedAt: now,
    _serverTs: serverTimestamp(),
  });
  clearFareRuleCache();
  return {
    id: ref.id,
    ...p,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUid,
  };
}

export async function updateFareRule(
  id: string,
  changes: Partial<Omit<FareRule, "id" | "createdAt" | "createdBy">>,
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...changes,
    updatedAt: new Date().toISOString(),
    _serverTs: serverTimestamp(),
  });
  clearFareRuleCache();
}

export async function setActiveRule(
  ruleId: string,
  serviceType: FareRuleServiceType,
): Promise<void> {
  const q = query(
    collection(db, COL),
    where("serviceType", "==", serviceType),
    where("isActive", "==", true),
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  snap.docs.forEach((d) => {
    if (d.id !== ruleId)
      batch.update(d.ref, { isActive: false, updatedAt: now });
  });
  batch.update(doc(db, COL, ruleId), { isActive: true, updatedAt: now });
  await batch.commit();
  clearFareRuleCache();
}

export async function disableFareRule(id: string): Promise<void> {
  await updateFareRule(id, { isActive: false });
}

// ── Shared Google Maps helper ─────────────────────────────────────────────────

function waitForMaps(): Promise<void> {
  return new Promise((res) => {
    if (typeof google !== "undefined" && google.maps) {
      res();
      return;
    }
    const iv = setInterval(() => {
      if (typeof google !== "undefined" && google.maps) {
        clearInterval(iv);
        res();
      }
    }, 100);
  });
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function getDistanceFromMaps(
  origin: LatLng,
  destination: LatLng,
): Promise<{ distanceKm: number; durationMins: number }> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    const km = haversineKm(origin, destination) * 1.35;
    return {
      distanceKm: Math.round(km * 10) / 10,
      durationMins: Math.round(km * 2),
    };
  }
  await waitForMaps();
  return new Promise((resolve, reject) => {
    new google.maps.DistanceMatrixService().getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [
          new google.maps.LatLng(destination.lat, destination.lng),
        ],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (result, status) => {
        if (status !== "OK" || !result) {
          reject(new Error(`Maps error: ${status}`));
          return;
        }
        const el = result.rows[0]?.elements[0];
        if (!el || el.status !== "OK") {
          reject(new Error("Route not found"));
          return;
        }
        resolve({
          distanceKm: Math.round((el.distance.value / 1000) * 10) / 10,
          durationMins: Math.round(el.duration.value / 60),
        });
      },
    );
  });
}

// ── Shared tiered pricing function ────────────────────────────────────────────

function applyTiers(
  distanceKm: number,
  tiers: NonNullable<FareRule["tiers"]>,
): {
  baseCharge: number;
  distanceCharge: number;
  ratePerKm: number;
  tierUsed: string;
} {
  const sorted = [...tiers].sort((a, b) => a.minKm - b.minKm);
  let tier = sorted[0];
  for (const t of sorted) {
    if (distanceKm >= t.minKm) tier = t;
  }
  const distanceCharge = Math.round(distanceKm * tier.ratePerKm);
  const maxLabel = tier.maxKm >= 9999 ? "∞" : `${tier.maxKm}`;
  return {
    baseCharge: tier.baseCharge,
    distanceCharge,
    ratePerKm: tier.ratePerKm,
    tierUsed: `${tier.minKm}–${maxLabel} km @ LKR ${tier.ratePerKm}/km`,
  };
}

// ── Engine A: Standard Distance fare ─────────────────────────────────────────
// Uses /fareRules where serviceType == 'Distance'

export async function calculateDynamicFare(
  origin: LatLng,
  destination: LatLng,
): Promise<FarePricingResult> {
  const [{ distanceKm, durationMins }, rule] = await Promise.all([
    getDistanceFromMaps(origin, destination),
    getActiveFareRule("Distance"),
  ]);

  if (!rule?.tiers?.length) {
    // Safe fallback — no Distance rule configured
    const ratePerKm = 150;
    const baseCharge = 500;
    const distanceCharge = Math.round(distanceKm * ratePerKm);
    const total = baseCharge + distanceCharge;
    return {
      fare: total,
      distanceKm,
      durationMins,
      fareRuleId: "fallback",
      fareRuleName: "Default Rate (no rule configured)",
      breakdown: {
        baseCharge,
        distanceCharge,
        ratePerKm,
        tierUsed: `Fallback @ LKR ${ratePerKm}/km`,
        total,
      },
    };
  }

  const { baseCharge, distanceCharge, ratePerKm, tierUsed } = applyTiers(
    distanceKm,
    rule.tiers,
  );
  const total = baseCharge + distanceCharge;
  return {
    fare: total,
    distanceKm,
    durationMins,
    fareRuleId: rule.id,
    fareRuleName: rule.name,
    breakdown: { baseCharge, distanceCharge, ratePerKm, tierUsed, total },
  };
}

// ── Engine B: Immediate Distance fare ─────────────────────────────────────────
// Uses /fareRules where serviceType == 'Immediate Distance'
// Completely separate — no interaction with Engine A.

export async function calculateImmediateFare(
  origin: LatLng,
  destination: LatLng,
): Promise<ImmediateFareResult> {
  const [{ distanceKm, durationMins }, rule] = await Promise.all([
    getDistanceFromMaps(origin, destination),
    getActiveFareRule("Immediate Distance"),
  ]);

  if (!rule?.tiers?.length) {
    // Safe fallback — no Immediate Distance rule configured, use LKR 3,000 flat
    return {
      fare: 3000,
      distanceKm,
      durationMins,
      fareRuleId: "immediate-fallback",
      fareRuleName: "Immediate Default Rate",
      breakdown: {
        baseCharge: 3000,
        distanceCharge: 0,
        ratePerKm: 0,
        tierUsed: "Flat fallback (no immediate rule configured)",
        total: 3000,
      },
    };
  }

  const { baseCharge, distanceCharge, ratePerKm, tierUsed } = applyTiers(
    distanceKm,
    rule.tiers,
  );
  const total = baseCharge + distanceCharge;
  return {
    fare: total,
    distanceKm,
    durationMins,
    fareRuleId: rule.id,
    fareRuleName: rule.name,
    breakdown: { baseCharge, distanceCharge, ratePerKm, tierUsed, total },
  };
}

// ── Flat-rate calculator (Hourly / Full Day) ──────────────────────────────────

export async function calculateFlatFareDynamic(
  serviceType: "Hourly" | "Full Day",
  detail: string,
): Promise<FarePricingResult> {
  const rule = await getActiveFareRule(serviceType);

  const fallbackHourly: Record<string, number> = {
    "1h": 2500,
    "2h": 3500,
    "3h": 4500,
    "4h": 5500,
    "5h": 6000,
    "6h": 7000,
    "8h": 9000,
  };
  const fallbackFullDay: Record<string, number> = {
    "6h": 7000,
    "12h": 13000,
    "24h": 20000,
    "48h": 35000,
  };

  const rates =
    rule?.flatRates ??
    (serviceType === "Hourly" ? fallbackHourly : fallbackFullDay);
  const fare = rates[detail] ?? Object.values(rates)[0] ?? 0;
  const hrs = parseInt(detail, 10);

  return {
    fare,
    distanceKm: 0,
    durationMins: hrs * 60,
    fareRuleId: rule?.id ?? "fallback",
    fareRuleName: rule?.name ?? "Default Rate",
    breakdown: {
      baseCharge: fare,
      distanceCharge: 0,
      ratePerKm: 0,
      total: fare,
    },
  };
}

// ── Reverse geocode ───────────────────────────────────────────────────────────

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  await waitForMaps();
  return new Promise((resolve, reject) => {
    new google.maps.Geocoder().geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === "OK" && results?.[0])
          resolve(results[0].formatted_address);
        else reject(new Error(`Geocoding failed: ${status}`));
      },
    );
  });
}

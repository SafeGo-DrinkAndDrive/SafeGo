// ─── src/services/fareService.ts (CLIENT-SIDE) ───────────────────────────────
// Uses Google Maps Distance Matrix API directly from the browser.
// Rate: LKR 1,000 per km (base from the shortest driving route).
// Falls back to straight-line Haversine × 1.35 if Maps API key is absent.
// ─────────────────────────────────────────────────────────────────────────────
import type { LatLng, ServiceType } from '../types';

export interface FareResult {
  distanceKm:  number;
  durationMins: number;
  fare:         number;
  breakdown: {
    ratePerKm:    number;
    distanceKm:   number;
    baseCharge:   number;
    distanceCharge: number;
    total:        number;
  };
}

// ── Rates (LKR) ───────────────────────────────────────────────────────────────
const RATE_PER_KM   = 1000;   // will be configurable later
const BASE_CHARGE   = 0;      // no flat base for now

// Hourly / Full Day flat rates (for non-Distance services)
const HOURLY_RATES: Record<string, number> = {
  '1h': 2500, '2h': 3500, '3h': 4500,
  '4h': 5500, '6h': 7000, '12h': 12000,
};
const FULLDAY_RATES: Record<string, number> = {
  '4h': 5000, '6h': 7000, '8h': 9000,
  '10h': 11000, '12h': 13000,
};

// ── Distance Matrix via Google Maps JS SDK ────────────────────────────────────

function waitForMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof google !== 'undefined' && google.maps) { resolve(); return; }
    const iv = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps) {
        clearInterval(iv);
        resolve();
      }
    }, 100);
  });
}

async function getRealDistance(
  origin:      LatLng,
  destination: LatLng,
): Promise<{ distanceKm: number; durationMins: number }> {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    // Haversine fallback
    const km = haversineKm(origin, destination) * 1.35;
    return { distanceKm: Math.round(km * 10) / 10, durationMins: Math.round(km * 2) };
  }

  await waitForMaps();

  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins:      [new google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
        travelMode:   google.maps.TravelMode.DRIVING,
        unitSystem:   google.maps.UnitSystem.METRIC,
      },
      (result, status) => {
        if (status !== 'OK' || !result) {
          reject(new Error(`Distance Matrix error: ${status}`));
          return;
        }
        const element = result.rows[0]?.elements[0];
        if (!element || element.status !== 'OK') {
          reject(new Error('Could not calculate route between selected locations.'));
          return;
        }
        const distanceKm  = element.distance.value / 1000;
        const durationMins = Math.round(element.duration.value / 60);
        resolve({
          distanceKm:   Math.round(distanceKm * 10) / 10,
          durationMins,
        });
      },
    );
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function calculateFareForDistance(
  origin:      LatLng,
  destination: LatLng,
): Promise<FareResult> {
  const { distanceKm, durationMins } = await getRealDistance(origin, destination);
  const distanceCharge = Math.round(distanceKm * RATE_PER_KM);
  const total          = BASE_CHARGE + distanceCharge;

  return {
    distanceKm,
    durationMins,
    fare: total,
    breakdown: {
      ratePerKm:      RATE_PER_KM,
      distanceKm,
      baseCharge:     BASE_CHARGE,
      distanceCharge,
      total,
    },
  };
}

export function calculateFlatFare(
  serviceType: ServiceType,
  detail?:     string,
): FareResult {
  const key  = detail ?? (serviceType === 'Hourly' ? '2h' : '6h');
  const fare = serviceType === 'Hourly'
    ? (HOURLY_RATES[key] ?? HOURLY_RATES['2h'])
    : (FULLDAY_RATES[key] ?? FULLDAY_RATES['6h']);
  const hrs  = parseInt(key, 10);

  return {
    distanceKm:   0,
    durationMins: hrs * 60,
    fare,
    breakdown: {
      ratePerKm:      0,
      distanceKm:     0,
      baseCharge:     fare,
      distanceCharge: 0,
      total:          fare,
    },
  };
}

// ── Reverse geocoding — coords → address string ───────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  await waitForMaps();
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

// ── Haversine fallback ────────────────────────────────────────────────────────

function haversineKm(a: LatLng, b: LatLng): number {
  const R    = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s    = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function toRad(d: number) { return d * (Math.PI / 180); }

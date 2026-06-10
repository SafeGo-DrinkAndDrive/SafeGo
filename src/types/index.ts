// ─── src/types/index.ts ───────────────────────────────────────────────────────
// Phase 2 additions: emergencyContact, address on AppUser
// Phase 3 additions: FareRule, FareRuleTier, FarePricingResult
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth & Users ──────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'driver' | 'admin' | 'superAdmin';

export interface AppUser {
  uid:               string;
  name:              string;
  email:             string;
  phone:             string;
  emergencyContact?: string;   // Phase 2: optional, collected at PhoneSetup
  address?:          string;   // Phase 2: optional home address
  role:              UserRole;
  photoURL?:         string;
  vehicleRegistered: boolean;
  createdAt:         string;
}

// ── Vehicle ───────────────────────────────────────────────────────────────────

export type VehicleType = 'Car' | 'SUV' | 'Van' | 'Pickup';

export interface VehicleInsurance {
  provider:     string;
  policyNumber: string;
  expiryDate:   string;
}

export interface VehicleLicense {
  licenseNumber: string;
  expiryDate:    string;
}

export interface Vehicle {
  id:          string;
  userId:      string;
  vehicleType: VehicleType;
  make:        string;
  model:       string;
  year:        string;
  plateNumber: string;
  color:       string;
  insurance:   VehicleInsurance;
  license:     VehicleLicense;
  createdAt:   string;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export type ServiceType   = 'Distance' | 'Hourly' | 'Full Day';
export type BookingStatus = 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  address: string;
  placeId: string;
  coords:  LatLng;
}

export interface Booking {
  id:             string;
  userId:         string;
  userName:       string;
  userPhone:      string;
  vehicleId?:     string;
  pickupLocation: string;
  pickupCoords:   LatLng;
  dropLocation:   string;
  dropCoords:     LatLng;
  distance:       number;
  duration?:      number;
  serviceType:    ServiceType;
  serviceDetail?: string;
  fare:           number;
  fareRuleId?:    string;   // Phase 3: which fare rule was used
  status:         BookingStatus;
  scheduledDate:  string;
  scheduledTime:  string;
  createdAt:      string;
}

export interface CreateBookingPayload {
  pickupLocation: string;
  pickupCoords:   LatLng;
  dropLocation:   string;
  dropCoords:     LatLng;
  serviceType:    ServiceType;
  serviceDetail?: string;
  scheduledDate:  string;
  scheduledTime:  string;
}

export interface UpdateStatusPayload {
  status: BookingStatus;
}

// ── Fare Rules (Phase 3) ──────────────────────────────────────────────────────
//
// Stored in Firestore at: /fareRules/{ruleId}
//
// A FareRule defines pricing for one service type (Distance / Hourly / Full Day).
// Admin can create multiple rules, enable/disable them, and SafeGo always
// uses the single active rule per service type.
//
// Distance rules use tiers: each tier defines a km range and a per-km rate.
//   Example: 0–10 km → 180 LKR/km, 10–20 km → 150 LKR/km, 20+ → 130 LKR/km
//
// Hourly / Full Day rules use flatRates keyed by duration:
//   Example: { '2h': 3500, '4h': 5000, '6h': 7000 }

export interface FareRuleTier {
  minKm:     number;   // inclusive lower bound (first tier is always 0)
  maxKm:     number;   // exclusive upper bound (last tier uses Infinity → stored as 9999)
  ratePerKm: number;   // LKR per km for this distance band
  baseCharge: number;  // flat base charge added for any booking in this tier
}

export interface FareRule {
  id:          string;
  name:        string;            // e.g. "Standard Distance Rate"
  serviceType: ServiceType;       // which booking type this applies to
  isActive:    boolean;           // only one active rule per serviceType at a time
  description: string;

  // Distance-based rules
  tiers?:    FareRuleTier[];

  // Flat-rate rules (Hourly / Full Day)
  // keys are duration strings: '1h', '2h', '4h', '6h', '8h', '10h', '12h'
  flatRates?: Record<string, number>;

  createdAt:   string;
  updatedAt:   string;
  createdBy:   string;   // admin uid
}

// Result returned by the dynamic fare calculator
export interface FarePricingResult {
  fare:         number;
  distanceKm:   number;
  durationMins: number;
  fareRuleId:   string;
  fareRuleName: string;
  breakdown: {
    baseCharge:     number;
    distanceCharge: number;
    ratePerKm:      number;
    tierUsed?:      string;   // e.g. "10–20 km @ 150/km"
    total:          number;
  };
}

// Legacy — kept for backward compat with components that still use FareResult
export interface FareResult {
  distanceKm:   number;
  durationMins: number;
  fare:         number;
  breakdown: {
    ratePerKm:      number;
    distanceKm:     number;
    baseCharge:     number;
    distanceCharge: number;
    total:          number;
  };
}

export interface FareEstimate {
  fare:      number;
  distance:  number;
  duration?: number;
  breakdown: { base: number; variable: number; total: number };
}

export interface FareBreakdown {
  distance:      number;
  duration:      number;
  estimatedFare: number;
  breakdown: {
    baseFare?:     number;
    distanceFare?: number;
    hourlyFare?:   number;
    packageFare?:  number;
    total:         number;
  };
}

export interface ApiError {
  message: string;
  code?:   string;
}

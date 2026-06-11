// ─── src/types/index.ts ───────────────────────────────────────────────────────

// ── Auth & Users ──────────────────────────────────────────────────────────────

export type UserRole = "user" | "driver" | "admin" | "superAdmin";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact?: string;
  address?: string;
  role: UserRole;
  photoURL?: string;
  vehicleRegistered: boolean;
  suspended?: boolean;
  createdAt: string;
}

// ── Vehicle ───────────────────────────────────────────────────────────────────

export type VehicleType = "Car" | "SUV" | "Van" | "Pickup";

export interface VehicleInsurance {
  provider: string;
  policyNumber: string;
  expiryDate: string;
}

export interface VehicleLicense {
  licenseNumber: string;
  expiryDate: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  color: string;
  insurance: VehicleInsurance;
  license: VehicleLicense;
  createdAt: string;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export type ServiceType = "Distance" | "Hourly" | "Full Day";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled";
export type BookingType = "standard" | "immediate";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  address: string;
  placeId: string;
  coords: LatLng;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  vehicleId?: string;
  pickupLocation: string;
  pickupCoords: LatLng;
  dropLocation: string;
  dropCoords: LatLng;
  distance: number;
  duration?: number;
  estimatedDurationMins?: number;
  serviceType: ServiceType;
  serviceDetail?: string;
  fare: number;
  fareRuleId?: string;
  bookingType: BookingType;
  waitingSurcharge?: number;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  createdAt: string;
}

export interface CreateBookingPayload {
  pickupLocation: string;
  pickupCoords: LatLng;
  dropLocation: string;
  dropCoords: LatLng;
  serviceType: ServiceType;
  serviceDetail?: string;
  scheduledDate: string;
  scheduledTime: string;
}

export interface UpdateStatusPayload {
  status: BookingStatus;
}

// ── Booking Policy ────────────────────────────────────────────────────────────

export interface BookingPolicy {
  minAdvanceMins: number;
  immediateThresholdMins: number;
  freeWaitingMins: number;
  waitingIntervalMins: number;
  waitingChargePerInterval: number;
  hourlySlots: string[];
  fullDaySlots: string[];
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_BOOKING_POLICY: Omit<
  BookingPolicy,
  "updatedAt" | "updatedBy"
> = {
  minAdvanceMins: 40,
  immediateThresholdMins: 90,
  freeWaitingMins: 15,
  waitingIntervalMins: 15,
  waitingChargePerInterval: 300,
  hourlySlots: ["2h", "3h", "4h", "5h"],
  fullDaySlots: ["6h", "12h", "24h", "48h"],
};

// ── Fare Rules ────────────────────────────────────────────────────────────────
//
// FareRuleServiceType is a superset of ServiceType — it adds 'Immediate Distance'
// as a separate engine for immediate bookings. This keeps the two pricing
// systems completely independent in Firestore and in admin configuration.
//
// Firestore collection: /fareRules
//   Standard bookings  → query serviceType == 'Distance'
//   Immediate bookings → query serviceType == 'Immediate Distance'
//   Hourly/Full Day    → query serviceType == 'Hourly' | 'Full Day'

export type FareRuleServiceType =
  | "Distance" // standard distance booking
  | "Immediate Distance" // immediate booking — separate tiers
  | "Hourly"
  | "Full Day";

export interface FareRuleTier {
  minKm: number;
  maxKm: number;
  ratePerKm: number;
  baseCharge: number;
}

export interface FareRule {
  id: string;
  name: string;
  serviceType: FareRuleServiceType;
  isActive: boolean;
  description: string;
  tiers?: FareRuleTier[];
  flatRates?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ── Standard fare result (returned by calculateDynamicFare) ───────────────────

export interface FarePricingResult {
  fare: number;
  distanceKm: number;
  durationMins: number;
  fareRuleId: string;
  fareRuleName: string;
  breakdown: {
    baseCharge: number;
    distanceCharge: number;
    ratePerKm: number;
    tierUsed?: string;
    total: number;
  };
}

// ── Immediate fare result (returned by calculateImmediateFare) ────────────────
// Completely separate from FarePricingResult — no shared fields that could
// cause confusion when rendering the fare card.

export interface ImmediateFareResult {
  fare: number;
  distanceKm: number;
  durationMins: number;
  fareRuleId: string;
  fareRuleName: string;
  breakdown: {
    baseCharge: number;
    distanceCharge: number;
    ratePerKm: number;
    tierUsed?: string;
    total: number;
  };
}

// ── Legacy / compat ───────────────────────────────────────────────────────────

export interface FareResult {
  distanceKm: number;
  durationMins: number;
  fare: number;
  breakdown: {
    ratePerKm: number;
    distanceKm: number;
    baseCharge: number;
    distanceCharge: number;
    total: number;
  };
}

export interface FareEstimate {
  fare: number;
  distance: number;
  duration?: number;
  breakdown: { base: number; variable: number; total: number };
}

export interface FareBreakdown {
  distance: number;
  duration: number;
  estimatedFare: number;
  breakdown: {
    baseFare?: number;
    distanceFare?: number;
    hourlyFare?: number;
    packageFare?: number;
    total: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
}

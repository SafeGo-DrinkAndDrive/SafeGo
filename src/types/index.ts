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
// Stored at /appSettings/bookingPolicy in Firestore.
// All values are admin-configurable — nothing is hardcoded in the app.

export interface BookingPolicy {
  // Time window rules
  minAdvanceMins: number; // hard block — default 40
  immediateThresholdMins: number; // window — default 90
  immediateBaseFare: number; // fixed LKR — default 3000

  // Waiting surcharge (Distance bookings only)
  freeWaitingMins: number; // grace period — default 15
  waitingIntervalMins: number; // billing block — default 15
  waitingChargePerInterval: number; // LKR per block — default 300

  // Package slot configuration (admin-managed)
  // Slots that appear in the booking UI for each service type.
  // Values are strings like '2h', '3h', '24h', '48h'.
  hourlySlots: string[]; // default: ['2h','3h','4h','5h']
  fullDaySlots: string[]; // default: ['6h','12h','24h','48h']

  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_BOOKING_POLICY: Omit<
  BookingPolicy,
  "updatedAt" | "updatedBy"
> = {
  minAdvanceMins: 40,
  immediateThresholdMins: 90,
  immediateBaseFare: 3000,
  freeWaitingMins: 15,
  waitingIntervalMins: 15,
  waitingChargePerInterval: 300,
  hourlySlots: ["2h", "3h", "4h", "5h"],
  fullDaySlots: ["6h", "12h", "24h", "48h"],
};

// ── Fare ──────────────────────────────────────────────────────────────────────

export interface FareRuleTier {
  minKm: number;
  maxKm: number;
  ratePerKm: number;
  baseCharge: number;
}

export interface FareRule {
  id: string;
  name: string;
  serviceType: ServiceType;
  isActive: boolean;
  description: string;
  tiers?: FareRuleTier[];
  flatRates?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

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

// ─── src/types/index.ts ───────────────────────────────────────────────────────

// ── Auth & Users ──────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

export interface AppUser {
  uid:               string;
  name:              string;
  email:             string;
  phone:             string;
  role:              UserRole;
  photoURL?:         string;
  vehicleRegistered: boolean;   // false until VehicleSetup is completed
  createdAt:         string;
}

// ── Vehicle ───────────────────────────────────────────────────────────────────
// Stored as a subcollection: /users/{uid}/vehicles/{vehicleId}
// primaryVehicleId on the user doc points to the active one.

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
  make:        string;       // e.g. Toyota
  model:       string;       // e.g. Prius
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

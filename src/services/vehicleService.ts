// ─── src/services/vehicleService.ts ──────────────────────────────────────────
// Handles all Firestore operations for vehicle registration.
//
// Firestore structure:
//   /users/{uid}                        ← user profile (vehicleRegistered: bool)
//   /users/{uid}/vehicles/{vehicleId}   ← vehicle documents (subcollection)
// ─────────────────────────────────────────────────────────────────────────────
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Vehicle, VehicleType, VehicleInsurance, VehicleLicense } from '../types';

// ── Payload for creating a vehicle ────────────────────────────────────────────

export interface CreateVehiclePayload {
  vehicleType: VehicleType;
  make:        string;
  model:       string;
  year:        string;
  plateNumber: string;
  color:       string;
  insurance:   VehicleInsurance;
  license:     VehicleLicense;
}

// ── Create vehicle + mark user as registered ──────────────────────────────────

export async function registerVehicle(
  uid:     string,
  payload: CreateVehiclePayload,
): Promise<Vehicle> {
  const vehiclesRef = collection(db, 'users', uid, 'vehicles');

  // 1. Save vehicle document in subcollection
  const docRef = await addDoc(vehiclesRef, {
    userId:      uid,
    vehicleType: payload.vehicleType,
    make:        payload.make.trim(),
    model:       payload.model.trim(),
    year:        payload.year,
    plateNumber: payload.plateNumber.trim().toUpperCase(),
    color:       payload.color.trim(),
    insurance:   payload.insurance,
    license:     payload.license,
    createdAt:   new Date().toISOString(),
    _serverTs:   serverTimestamp(),
  });

  // 2. Mark the user document as vehicle-registered
  //    Also store the primary vehicle ID for quick lookup
  await updateDoc(doc(db, 'users', uid), {
    vehicleRegistered: true,
    primaryVehicleId:  docRef.id,
  });

  return {
    id:          docRef.id,
    userId:      uid,
    vehicleType: payload.vehicleType,
    make:        payload.make.trim(),
    model:       payload.model.trim(),
    year:        payload.year,
    plateNumber: payload.plateNumber.trim().toUpperCase(),
    color:       payload.color.trim(),
    insurance:   payload.insurance,
    license:     payload.license,
    createdAt:   new Date().toISOString(),
  };
}

// ── Fetch all vehicles for a user ─────────────────────────────────────────────

export async function getUserVehicles(uid: string): Promise<Vehicle[]> {
  const q    = query(
    collection(db, 'users', uid, 'vehicles'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle));
}

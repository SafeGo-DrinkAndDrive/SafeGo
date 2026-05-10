// ─── src/components/VehicleRoute.tsx ─────────────────────────────────────────
// Route guard for pages that require:
//   1. User is authenticated
//   2. User has completed vehicle registration
//
// Redirects:
//   • Not logged in           → /login
//   • Logged in, no vehicle   → /vehicle-setup
//   • Logged in + vehicle     → renders children
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props { children: React.ReactNode; }

export const VehicleRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated, vehicleRegistered, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!vehicleRegistered) {
    return <Navigate to="/vehicle-setup" replace />;
  }

  return <>{children}</>;
};

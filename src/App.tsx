// ─── src/App.tsx ──────────────────────────────────────────────────────────────
// Routing changes (Phase 2):
//   • Added /phone-setup route for Google-auth users missing a phone number
//   • PhoneGate component intercepts /vehicle-setup if phone is missing
//
// Routing logic:
//   Google login → AuthContext sets user with phone: '' → Login.tsx calls
//   setShouldRedirect → useEffect checks phone → if empty, goes /phone-setup
//   → PhoneSetup saves phone → navigate('/vehicle-setup')
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './contexts/AuthContext';
import { setApiToken }            from './services/api';
import { Layout }                 from './components/Layout';
import { ProtectedRoute }         from './components/ProtectedRoute';
import { VehicleRoute }           from './components/VehicleRoute';
import { AdminRoute }             from './components/AdminRoute';
import { Home }                   from './pages/Home';
import { Register }               from './pages/Register';
import { Login }                  from './pages/Login';
import { PhoneSetup }             from './pages/PhoneSetup';
import { VehicleSetup }           from './pages/VehicleSetup';
import { Booking }                from './pages/Booking';
import { BookingSuccess }         from './pages/BookingSuccess';
import { MyBookings }             from './pages/MyBookings';
import { AdminDashboard }         from './pages/AdminDashboard';

// Syncs the Firebase ID token to the API service layer whenever it changes.
function TokenSync() {
  const { idToken } = useAuth();
  useEffect(() => { setApiToken(idToken); }, [idToken]);
  return null;
}

// ── PhoneGate ─────────────────────────────────────────────────────────────────
// Guards /vehicle-setup: if the authenticated user has no phone number yet,
// redirect them to /phone-setup first. Existing users with phones pass through.
function PhoneGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Phone missing → collect it before vehicle setup
  if (!user?.phone?.trim()) {
    return <Navigate to="/phone-setup" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Router>
        <TokenSync />
        <Layout>
          <Routes>
            {/* ── Public ────────────────────────────────────────────────── */}
            <Route path="/"         element={<Home />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ── Phone collection (Google-auth users only) ──────────────── */}
            <Route
              path="/phone-setup"
              element={
                <ProtectedRoute>
                  <PhoneSetup />
                </ProtectedRoute>
              }
            />

            {/* ── Vehicle setup (requires phone) ────────────────────────── */}
            <Route
              path="/vehicle-setup"
              element={
                <PhoneGate>
                  <VehicleSetup />
                </PhoneGate>
              }
            />

            {/* ── Authenticated + vehicle registered ────────────────────── */}
            <Route
              path="/booking"
              element={
                <VehicleRoute>
                  <Booking />
                </VehicleRoute>
              }
            />
            <Route
              path="/booking-success"
              element={
                <VehicleRoute>
                  <BookingSuccess />
                </VehicleRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <VehicleRoute>
                  <MyBookings />
                </VehicleRoute>
              }
            />

            {/* ── Admin only ────────────────────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

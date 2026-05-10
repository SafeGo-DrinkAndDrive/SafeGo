// ─── src/App.tsx ──────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth }  from './contexts/AuthContext';
import { setApiToken }            from './services/api';
import { Layout }                 from './components/Layout';
import { ProtectedRoute }         from './components/ProtectedRoute';
import { VehicleRoute }           from './components/VehicleRoute';
import { AdminRoute }             from './components/AdminRoute';
import { Home }                   from './pages/Home';
import { Register }               from './pages/Register';
import { Login }                  from './pages/Login';
import { VehicleSetup }           from './pages/VehicleSetup';
import { Booking }                from './pages/Booking';
import { BookingSuccess }         from './pages/BookingSuccess';
import { MyBookings }             from './pages/MyBookings';
import { AdminDashboard }         from './pages/AdminDashboard';

function TokenSync() {
  const { idToken } = useAuth();
  useEffect(() => { setApiToken(idToken); }, [idToken]);
  return null;
}

export function App() {
  return (
    <AuthProvider>
      <Router>
        <TokenSync />
        <Layout>
          <Routes>
            {/* Public */}
            <Route path="/"         element={<Home />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated only (no vehicle check) */}
            <Route
              path="/vehicle-setup"
              element={
                <ProtectedRoute>
                  <VehicleSetup />
                </ProtectedRoute>
              }
            />

            {/* Authenticated + vehicle registered */}
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

            {/* Admin only */}
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

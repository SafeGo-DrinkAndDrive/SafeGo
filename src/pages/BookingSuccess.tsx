// ─── src/pages/BookingSuccess.tsx ─────────────────────────────────────────────
// Shown immediately after a booking is confirmed.
// Receives the full Booking object via React Router location.state.
// If accessed directly (no state), redirects to /my-bookings.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle, MapPin, Navigation, Calendar,
  Clock, Car, Receipt, MessageCircle, ArrowRight,
  ClipboardList, Home,
} from 'lucide-react';
import { GlassCard }  from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import type { Booking } from '../types';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '94770000000';

const STATUS_STYLE: Record<string, string> = {
  pending:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  confirmed: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  ongoing:   'text-brand-red  bg-brand-red/10  border-brand-red/30',
  completed: 'text-green-400  bg-green-400/10  border-green-400/30',
  cancelled: 'text-red-400    bg-red-400/10    border-red-400/30',
};

function openWhatsApp(booking: Booking) {
  const msg =
    `🚗 *SafeGo Booking Confirmed*\n\n` +
    `🆔 Booking ID: ${booking.id}\n` +
    `👤 Name: ${booking.userName}\n` +
    `📞 Phone: ${booking.userPhone}\n` +
    `📍 Pickup: ${booking.pickupLocation}\n` +
    `🎯 Drop-off: ${booking.dropLocation}\n` +
    `🚘 Service: ${booking.serviceType}${booking.serviceDetail ? ` · ${booking.serviceDetail}` : ''}\n` +
    `📅 Date: ${booking.scheduledDate} at ${booking.scheduledTime}\n` +
    `💰 Fare: LKR ${booking.fare.toLocaleString()}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

export const BookingSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Booking is passed as router state from Booking.tsx
  const booking = (location.state as { booking?: Booking })?.booking ?? null;

  // Guard: if someone navigates here directly without state, send them to My Bookings
  useEffect(() => {
    if (!booking) {
      navigate('/my-bookings', { replace: true });
    }
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-green-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* ── Success header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-400" />
          </motion.div>

          <h1 className="text-4xl font-bold text-white mb-3">Booking Confirmed!</h1>
          <p className="text-text-sub text-lg">
            Your ride has been booked. Our team will confirm your driver shortly.
          </p>

          {/* Booking ID pill */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-text-sub">
            <Receipt className="w-4 h-4" />
            Booking ID: <span className="text-white font-semibold">{booking.id.slice(0, 12).toUpperCase()}</span>
          </div>
        </motion.div>

        {/* ── Booking detail card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassCard glowColor="red">

            {/* Status + service type header */}
            <div className="flex items-center justify-between mb-6 pb-5 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Car className="w-5 h-5 text-brand-red" />
                {booking.serviceType}
                {booking.serviceDetail && (
                  <span className="text-text-sub font-normal text-sm">· {booking.serviceDetail}</span>
                )}
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLE[booking.status] ?? STATUS_STYLE.pending}`}>
                {booking.status}
              </span>
            </div>

            {/* Route */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-brand-red/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-text-sub mb-0.5">Pickup</p>
                  <p className="text-white font-medium">{booking.pickupLocation}</p>
                </div>
              </div>

              {/* Connector line */}
              <div className="ml-4 w-px h-4 bg-white/10" />

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-brand-gray" />
                </div>
                <div>
                  <p className="text-xs text-text-sub mb-0.5">Drop-off</p>
                  <p className="text-white font-medium">{booking.dropLocation}</p>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-white/3 rounded-xl border border-white/8">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-sub flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-sub">Date</p>
                  <p className="text-sm text-white font-medium">{booking.scheduledDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-sub flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-sub">Time</p>
                  <p className="text-sm text-white font-medium">{booking.scheduledTime}</p>
                </div>
              </div>
              {booking.distance > 0 && (
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-text-sub flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-sub">Distance</p>
                    <p className="text-sm text-white font-medium">{booking.distance} km</p>
                  </div>
                </div>
              )}
              {booking.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-sub flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-sub">Duration</p>
                    <p className="text-sm text-white font-medium">{booking.duration}h</p>
                  </div>
                </div>
              )}
            </div>

            {/* Fare total */}
            <div className="flex items-center justify-between p-4 bg-brand-red/5 border border-brand-red/20 rounded-xl">
              <div className="flex items-center gap-2 text-text-sub">
                <Receipt className="w-4 h-4" />
                <span className="text-sm">Total Fare</span>
              </div>
              <span className="text-2xl font-bold text-brand-red">
                LKR {booking.fare.toLocaleString()}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Info note ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm text-blue-300 text-center"
        >
          Our team will contact you on <span className="font-semibold text-white">{booking.userPhone}</span> to confirm your driver.
        </motion.div>

        {/* ── Action buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {/* WhatsApp */}
          <button
            onClick={() => openWhatsApp(booking)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Open WhatsApp
          </button>

          {/* My Bookings */}
          <Link
            to="/my-bookings"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-medium hover:bg-white/10 transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            My Bookings
          </Link>

          {/* Book another */}
          <NeonButton variant="primary" onClick={() => navigate('/booking')}>
            <span className="flex items-center gap-2 text-sm">
              Book Another <ArrowRight className="w-4 h-4" />
            </span>
          </NeonButton>
        </motion.div>

        {/* Home link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-sub hover:text-white transition-colors">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </motion.div>

      </div>
    </div>
  );
};

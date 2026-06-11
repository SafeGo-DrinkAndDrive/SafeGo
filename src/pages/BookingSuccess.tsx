// ─── src/pages/BookingSuccess.tsx ─────────────────────────────────────────────
// Changes:
//   • Shows "Immediate Booking" badge + amber styling when bookingType=immediate
//   • Shows estimated travel time (F2) from booking.estimatedDurationMins
//   • Shows waiting policy summary (F4) at the bottom
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle,
  MapPin,
  Navigation,
  Calendar,
  Clock,
  Car,
  Receipt,
  MessageCircle,
  ArrowRight,
  ClipboardList,
  Home,
  Zap,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { NeonButton } from "../components/NeonButton";
import type { Booking, BookingPolicy } from "../types";

// ── Constants ─────────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "94770000000";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMins(mins: number): string {
  if (!mins || mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function buildWhatsAppMsg(booking: Booking, isImmediate: boolean): string {
  return (
    `🚗 *SafeGo Booking ${isImmediate ? "⚡ IMMEDIATE" : "Confirmed"}*\n\n` +
    `🆔 ID: ${booking.id.slice(0, 12).toUpperCase()}\n` +
    `👤 Name: ${booking.userName}\n` +
    `📞 Phone: ${booking.userPhone}\n` +
    `📍 Pickup: ${booking.pickupLocation}\n` +
    `🎯 Drop-off: ${booking.dropLocation}\n` +
    `🚘 Service: ${booking.serviceType}${booking.serviceDetail ? ` · ${booking.serviceDetail}` : ""}\n` +
    `📅 Date: ${booking.scheduledDate} at ${booking.scheduledTime}\n` +
    (booking.estimatedDurationMins
      ? `⏱ Est. Travel Time: ${fmtMins(booking.estimatedDurationMins)}\n`
      : "") +
    `💰 Fare: LKR ${booking.fare.toLocaleString()}` +
    (isImmediate
      ? "\n⚡ This is an IMMEDIATE booking — please confirm driver availability."
      : "")
  );
}

function openWhatsApp(booking: Booking, isImmediate: boolean) {
  const msg = buildWhatsAppMsg(booking, isImmediate);
  window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

// ── Status style ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  confirmed: "text-blue-400   bg-blue-400/10   border-blue-400/30",
  ongoing: "text-brand-red  bg-brand-red/10  border-brand-red/30",
  completed: "text-green-400  bg-green-400/10  border-green-400/30",
  cancelled: "text-red-400    bg-red-400/10    border-red-400/30",
};

// ── Component ─────────────────────────────────────────────────────────────────

export const BookingSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    booking?: Booking;
    userPhone?: string;
    bookingType?: string;
    policy?: BookingPolicy;
  } | null;

  const booking = state?.booking ?? null;
  const policy = state?.policy ?? null;
  const isImmediate =
    (state?.bookingType ?? booking?.bookingType) === "immediate";

  useEffect(() => {
    if (!booking) navigate("/my-bookings", { replace: true });
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 relative">
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none ${
          isImmediate ? "bg-amber-500/5" : "bg-green-500/5"
        }`}
      />

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
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            }}
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 border-2 ${
              isImmediate
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}
          >
            {isImmediate ? (
              <Zap className="w-12 h-12 text-amber-400" />
            ) : (
              <CheckCircle className="w-12 h-12 text-green-400" />
            )}
          </motion.div>

          <h1 className="text-4xl font-bold text-white mb-2">
            {isImmediate ? "Immediate Booking Sent!" : "Booking Confirmed!"}
          </h1>
          <p className="text-text-sub">
            {isImmediate
              ? "Your immediate booking request has been submitted. A driver will confirm shortly."
              : "Your ride is booked. Our team will confirm your driver soon."}
          </p>

          {/* Booking type badge */}
          {isImmediate && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-medium">
              <Zap className="w-4 h-4" />
              Immediate Booking — Fixed Rate Applied
            </div>
          )}
        </motion.div>

        {/* ── Booking card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard glowColor={isImmediate ? "gray" : "red"}>
            {/* Booking ID + status */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/8">
              <div>
                <p className="text-xs text-text-sub mb-0.5">Booking ID</p>
                <p className="text-sm font-mono font-semibold text-white">
                  {booking.id.slice(0, 16).toUpperCase()}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLE[booking.status]}`}
              >
                {booking.status}
              </span>
            </div>

            {/* Route */}
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-sub">Pickup</p>
                  <p className="text-sm text-white">{booking.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Navigation className="w-4 h-4 text-text-sub flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-sub">Drop-off</p>
                  <p className="text-sm text-white">{booking.dropLocation}</p>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-white/3 rounded-xl border border-white/8">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-sub flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-sub">Date</p>
                  <p className="text-sm text-white font-medium">
                    {booking.scheduledDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-sub flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-sub">Time</p>
                  <p className="text-sm text-white font-medium">
                    {booking.scheduledTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-text-sub flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-sub">Service</p>
                  <p className="text-sm text-white font-medium">
                    {booking.serviceType}
                    {booking.serviceDetail && (
                      <span className="text-text-sub">
                        {" "}
                        · {booking.serviceDetail}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {booking.distance > 0 && (
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-text-sub flex-shrink-0" />
                  <div>
                    <p className="text-xs text-text-sub">Distance</p>
                    <p className="text-sm text-white font-medium">
                      {booking.distance} km
                    </p>
                  </div>
                </div>
              )}
              {/* F2 — estimated duration */}
              {booking.estimatedDurationMins &&
                booking.estimatedDurationMins > 0 && (
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                    <Timer className="w-4 h-4 text-text-sub flex-shrink-0" />
                    <div>
                      <p className="text-xs text-text-sub">Est. Travel Time</p>
                      <p className="text-sm text-white font-medium">
                        {fmtMins(booking.estimatedDurationMins)}
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {/* Fare */}
            <div
              className={`flex items-center justify-between p-4 rounded-xl border mb-2 ${
                isImmediate
                  ? "bg-amber-500/8 border-amber-500/20"
                  : "bg-brand-red/5 border-brand-red/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {isImmediate ? (
                  <Zap className="w-4 h-4 text-amber-400" />
                ) : (
                  <Receipt className="w-4 h-4 text-text-sub" />
                )}
                <span className="text-sm text-text-sub">
                  {isImmediate ? "Immediate Rate" : "Total Fare"}
                </span>
              </div>
              <span
                className={`text-2xl font-bold ${isImmediate ? "text-amber-400" : "text-brand-red"}`}
              >
                LKR {booking.fare.toLocaleString()}
              </span>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Immediate booking notice ── */}
        {isImmediate && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Because this is an immediate booking, a fixed rate of{" "}
                <span className="font-bold text-amber-200">
                  LKR {booking.fare.toLocaleString()}
                </span>{" "}
                has been applied. Please open WhatsApp to confirm driver
                availability as soon as possible.
              </p>
            </div>
          </motion.div>
        )}

        {/* F4 — Waiting policy reminder */}
        {policy && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-white">
                Waiting Time Policy
              </p>
            </div>
            <p className="text-xs text-blue-300/80 leading-relaxed">
              The first{" "}
              <span className="font-semibold text-white">
                {policy.freeWaitingMins} minutes
              </span>{" "}
              of waiting beyond the estimated duration are free. After that,{" "}
              <span className="font-semibold text-white">
                LKR {policy.waitingChargePerInterval.toLocaleString()}
              </span>{" "}
              is added for every {policy.waitingIntervalMins} additional
              minutes.
            </p>
          </motion.div>
        )}

        {/* ── Contact info ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 p-4 bg-white/3 border border-white/8 rounded-xl text-sm text-blue-300 text-center"
        >
          We'll contact you on{" "}
          <span className="font-semibold text-white">{booking.userPhone}</span>{" "}
          to confirm your driver.
        </motion.div>

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <button
            onClick={() => openWhatsApp(booking, isImmediate)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            {isImmediate ? "Confirm via WhatsApp" : "Open WhatsApp"}
          </button>

          <Link
            to="/my-bookings"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-medium hover:bg-white/10 transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            My Bookings
          </Link>

          <NeonButton variant="primary" onClick={() => navigate("/booking")}>
            <span className="flex items-center gap-2 text-sm">
              Book Another <ArrowRight className="w-4 h-4" />
            </span>
          </NeonButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-sub hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

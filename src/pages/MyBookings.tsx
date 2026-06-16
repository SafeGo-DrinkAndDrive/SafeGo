// ─── src/pages/MyBookings.tsx ─────────────────────────────────────────────────
// Changes:
//   • Completed booking cards and modal show finalFare (not just estimated fare)
//   • Waiting surcharge breakdown shown when applicable
//   • Actual trip duration shown for completed rides
//   • freeWaitingMins updated to 30 in the waiting policy display
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate }          from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Calendar, Clock, Receipt, RefreshCw,
  AlertCircle, Car, ArrowRight, CheckCircle, XCircle, X,
  MessageCircle, Route, Loader2, ClipboardList, Timer,
} from 'lucide-react';
import { GlassCard }    from '../components/GlassCard';
import { NeonButton }   from '../components/NeonButton';
import { useBookings }  from '../hooks/useBookings';
import type { Booking, BookingStatus } from '../types';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '94770000000';
const CANCEL_WINDOW_MS = 5 * 60 * 1000;

function canCancel(booking: Booking): boolean {
  if (booking.status !== 'pending') return false;
  return Date.now() - new Date(booking.createdAt).getTime() <= CANCEL_WINDOW_MS;
}
function msRemaining(booking: Booking): number {
  return Math.max(0, CANCEL_WINDOW_MS - (Date.now() - new Date(booking.createdAt).getTime()));
}
function formatCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}
function fmtMins(mins?: number): string {
  if (!mins || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins/60)}h ${mins%60}m`;
}
function buildWhatsAppMessage(booking: Booking): string {
  return (
    `🚗 *SafeGo Booking*\n\n` +
    `🆔 ID: ${booking.id.slice(0,12).toUpperCase()}\n` +
    `👤 Name: ${booking.userName}\n📞 Phone: ${booking.userPhone}\n` +
    `📍 Pickup: ${booking.pickupLocation}\n🎯 Drop-off: ${booking.dropLocation}\n` +
    `🚘 Service: ${booking.serviceType}${booking.serviceDetail?` · ${booking.serviceDetail}`:''}\n` +
    `📅 Date: ${booking.scheduledDate} at ${booking.scheduledTime}\n` +
    `📏 Distance: ${booking.distance} km\n` +
    `💰 Fare: LKR ${(booking.finalFare ?? booking.fare).toLocaleString()}\n` +
    `📋 Status: ${booking.status}`
  );
}
function openWhatsApp(booking: Booking) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(booking))}`, '_blank', 'noopener,noreferrer');
}

type TabFilter = BookingStatus | 'all';
const TABS: { key: TabFilter; label: string }[] = [
  { key:'all',label:'All' }, { key:'pending',label:'Pending' }, { key:'confirmed',label:'Confirmed' },
  { key:'ongoing',label:'Ongoing' }, { key:'completed',label:'Completed' }, { key:'cancelled',label:'Cancelled' },
];
const STATUS_STYLE: Record<BookingStatus, string> = {
  pending:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  confirmed: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  ongoing:   'text-brand-red  bg-brand-red/10  border-brand-red/30',
  completed: 'text-green-400  bg-green-400/10  border-green-400/30',
  cancelled: 'text-red-400    bg-red-400/10    border-red-400/30',
};

// ── Booking Modal ─────────────────────────────────────────────────────────────

const BookingModal: React.FC<{
  booking: Booking; onClose: () => void; onCancel: (id: string) => Promise<void>;
}> = ({ booking, onClose, onCancel }) => {
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelled,   setCancelled]   = useState(false);
  const [remaining,   setRemaining]   = useState(() => msRemaining(booking));
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (booking.status !== 'pending') return;
    timerRef.current = setInterval(() => {
      const ms = msRemaining(booking);
      setRemaining(ms);
      if (ms <= 0) clearInterval(timerRef.current);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [booking]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleCancel = async () => {
    setCancelling(true); setCancelError(null);
    try { await onCancel(booking.id); setCancelled(true); }
    catch (err: unknown) { setCancelError((err as Error).message ?? 'Cancellation failed.'); }
    finally { setCancelling(false); }
  };

  const displayStatus = cancelled ? 'cancelled' : booking.status;
  const eligible      = !cancelled && canCancel(booking) && remaining > 0;
  const isCompleted   = booking.status === 'completed';
  const hasFinalFare  = isCompleted && booking.finalFare !== undefined && booking.finalFare !== null;
  const hasSurcharge  = hasFinalFare && (booking.waitingSurcharge ?? 0) > 0;
  const displayFare   = hasFinalFare ? booking.finalFare! : booking.fare;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ opacity:0, y:40, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:40, scale:0.97 }} transition={{ type:'spring', damping:28, stiffness:380 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-background-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <p className="text-xs font-mono text-text-sub">#{booking.id.slice(0,12).toUpperCase()}</p>
            <h2 className="text-lg font-bold text-white mt-0.5">Booking Details</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLE[displayStatus]}`}>
              {displayStatus}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Route */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex flex-col items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-red flex-shrink-0" />
              <div className="w-0.5 h-6 bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/40 flex-shrink-0" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-text-sub mb-0.5">Pickup</p>
                <p className="text-sm text-white font-medium">{booking.pickupLocation}</p>
              </div>
              <div>
                <p className="text-xs text-text-sub mb-0.5">Drop-off</p>
                <p className="text-sm text-white font-medium">{booking.dropLocation}</p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-text-sub text-xs mb-1"><Car className="w-3.5 h-3.5" /> Service</div>
              <p className="text-white text-sm font-medium">{booking.serviceType}{booking.serviceDetail && <span className="text-text-sub font-normal"> · {booking.serviceDetail}</span>}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-text-sub text-xs mb-1"><Route className="w-3.5 h-3.5" /> Distance</div>
              <p className="text-white text-sm font-medium">{booking.distance} km</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-text-sub text-xs mb-1"><Calendar className="w-3.5 h-3.5" /> Date</div>
              <p className="text-white text-sm font-medium">{booking.scheduledDate}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-text-sub text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Time</div>
              <p className="text-white text-sm font-medium">{booking.scheduledTime}</p>
            </div>
            {booking.estimatedDurationMins && (
              <div className="bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-text-sub text-xs mb-1"><Timer className="w-3.5 h-3.5" /> Est. Duration</div>
                <p className="text-white text-sm font-medium">{fmtMins(booking.estimatedDurationMins)}</p>
              </div>
            )}
            {isCompleted && booking.actualDurationMins && (
              <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-green-400 text-xs mb-1"><Timer className="w-3.5 h-3.5" /> Actual Duration</div>
                <p className="text-white text-sm font-medium">{fmtMins(booking.actualDurationMins)}</p>
              </div>
            )}
          </div>

          {/* ── Fare breakdown (completed rides) ── */}
          {isCompleted ? (
            <div className={`rounded-xl p-4 border ${hasSurcharge ? 'bg-amber-500/8 border-amber-500/25' : 'bg-green-400/8 border-green-400/25'}`}>
              <div className="space-y-2.5 text-sm">
                {/* Estimated fare */}
                <div className="flex items-center justify-between">
                  <span className="text-text-sub">Estimated fare</span>
                  <span className={`${hasFinalFare ? 'text-text-sub line-through' : 'text-white font-bold'}`}>
                    LKR {booking.fare.toLocaleString()}
                  </span>
                </div>
                {/* Surcharge breakdown */}
                {hasSurcharge && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-text-sub">Waiting surcharge</span>
                      <span className="text-amber-400 font-medium">+LKR {booking.waitingSurcharge!.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-1 flex items-center justify-between">
                      <span className="text-white font-semibold">Final Fare</span>
                      <span className="text-amber-400 font-bold text-xl">LKR {displayFare.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {/* No surcharge — just show final fare */}
                {hasFinalFare && !hasSurcharge && (
                  <div className="border-t border-white/10 pt-2 mt-1 flex items-center justify-between">
                    <span className="text-white font-semibold">Final Fare</span>
                    <span className="text-green-400 font-bold text-xl">LKR {displayFare.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Non-completed fare */
            <div className="bg-brand-red/8 border border-brand-red/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-sub text-sm">
                <Receipt className="w-4 h-4" /> {isCompleted ? 'Final Fare' : 'Estimated Fare'}
              </div>
              <p className="text-2xl font-bold text-brand-red">LKR {booking.fare.toLocaleString()}</p>
            </div>
          )}

          {/* Cancellation window */}
          {booking.status === 'pending' && !cancelled && (
            <div className={`rounded-xl p-4 border ${eligible ? 'bg-yellow-400/5 border-yellow-400/20' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-yellow-400" />
                <p className="text-sm font-medium text-white">Free cancellation window</p>
              </div>
              {eligible
                ? <p className="text-xs text-yellow-400">Cancel free within <span className="font-bold">{formatCountdown(remaining)}</span></p>
                : <p className="text-xs text-text-sub">The 5-minute free cancellation window has passed.</p>
              }
            </div>
          )}
          {cancelled && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Booking cancelled successfully.
            </div>
          )}
          {cancelError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {cancelError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex flex-col sm:flex-row gap-3">
          <button onClick={() => openWhatsApp(booking)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all">
            <MessageCircle className="w-4 h-4" /> WhatsApp SafeGo
          </button>
          {eligible && !cancelled && (
            <button onClick={handleCancel} disabled={cancelling}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50">
              {cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</> : <><XCircle className="w-4 h-4" /> Cancel Booking</>}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Booking card ──────────────────────────────────────────────────────────────

const BookingCard: React.FC<{ booking: Booking; onClick: (b: Booking) => void }> = ({ booking, onClick }) => {
  const isCompleted  = booking.status === 'completed';
  const hasFinalFare = isCompleted && booking.finalFare !== undefined && booking.finalFare !== null;
  const hasSurcharge = hasFinalFare && (booking.waitingSurcharge ?? 0) > 0;
  const displayFare  = hasFinalFare ? booking.finalFare! : booking.fare;

  return (
    <motion.button initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} layout
      onClick={() => onClick(booking)} className="w-full text-left">
      <GlassCard className="p-5 hover:border-white/25 hover:bg-white/5 transition-all cursor-pointer active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-text-sub mb-1">#{booking.id.slice(0,12).toUpperCase()}</p>
            <p className="text-sm font-semibold text-white">
              {booking.serviceType}{booking.serviceDetail && <span className="text-text-sub font-normal"> · {booking.serviceDetail}</span>}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize flex-shrink-0 ${STATUS_STYLE[booking.status]}`}>
            {booking.status}
          </span>
        </div>
        <div className="space-y-1.5 mb-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-brand-red mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-sub truncate">{booking.pickupLocation}</p>
          </div>
          <div className="flex items-start gap-2">
            <Navigation className="w-3.5 h-3.5 text-text-sub mt-0.5 flex-shrink-0" />
            <p className="text-sm text-text-sub truncate">{booking.dropLocation}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs text-text-sub">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {booking.scheduledDate}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.scheduledTime}</span>
          </div>
          {/* Fare display */}
          <div className="text-right">
            {hasSurcharge ? (
              <>
                <p className="text-sm font-bold text-amber-400">LKR {displayFare.toLocaleString()}</p>
                <p className="text-xs text-text-sub line-through">LKR {booking.fare.toLocaleString()}</p>
              </>
            ) : (
              <p className={`text-sm font-bold ${hasFinalFare ? 'text-green-400' : 'text-white'}`}>
                LKR {displayFare.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        {/* Trip duration for completed rides */}
        {isCompleted && booking.actualDurationMins && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
            <Timer className="w-3 h-3" /> Trip: {fmtMins(booking.actualDurationMins)}
            {booking.estimatedDurationMins && ` (est. ${fmtMins(booking.estimatedDurationMins)})`}
          </div>
        )}
        {canCancel(booking) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400">
            <Timer className="w-3 h-3" /> Free cancellation available · tap to manage
          </div>
        )}
      </GlassCard>
    </motion.button>
  );
};

// ── Summary stats ─────────────────────────────────────────────────────────────

const SummaryStats: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const completed  = bookings.filter((b) => b.status === 'completed');
  // Use finalFare for completed bookings, else fare
  const totalSpent = completed.reduce((s, b) => s + (b.finalFare ?? b.fare), 0);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label:'Total Rides',  value: bookings.length,                                                    color:'text-white' },
        { label:'Completed',    value: completed.length,                                                   color:'text-green-400' },
        { label:'Pending',      value: bookings.filter((b) => b.status==='pending').length,                color:'text-yellow-400' },
        { label:'Total Spent',  value: `LKR ${totalSpent.toLocaleString()}`,                               color:'text-brand-red' },
      ].map(({ label, value, color }) => (
        <GlassCard key={label} className="p-4 text-center">
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-text-sub mt-0.5">{label}</p>
        </GlassCard>
      ))}
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: TabFilter; onBook: () => void }> = ({ tab, onBook }) => (
  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="text-center py-16">
    <ClipboardList className="w-12 h-12 text-text-sub mx-auto mb-4 opacity-40" />
    <h3 className="text-lg font-semibold text-white mb-2">{tab==='all' ? 'No bookings yet' : `No ${tab} bookings`}</h3>
    <p className="text-text-sub text-sm mb-6">
      {tab==='all' ? 'Your booking history will appear here.' : `No bookings with status "${tab}" right now.`}
    </p>
    {tab==='all' && <NeonButton variant="primary" onClick={onBook}>Book Your First Ride <ArrowRight className="w-4 h-4 ml-2" /></NeonButton>}
  </motion.div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

export const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const { bookings, isLoading, error, updateStatus, refresh } = useBookings();
  const [activeTab,       setActiveTab]       = useState<TabFilter>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filtered = activeTab === 'all' ? bookings : bookings.filter((b) => b.status === activeTab);

  const handleCancel = async (id: string) => {
    await updateStatus(id, 'cancelled');
    setSelectedBooking((prev) => prev ? { ...prev, status: 'cancelled' } : null);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Bookings</h1>
            <p className="text-text-sub">Tap any booking to view details or manage it</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refresh} disabled={isLoading}
              className="flex items-center gap-1.5 text-sm text-text-sub hover:text-white transition-colors">
              <RefreshCw className={`w-4 h-4 ${isLoading?'animate-spin':''}`} /> Refresh
            </button>
            <NeonButton variant="primary" onClick={() => navigate('/booking')}>
              <Car className="w-4 h-4 mr-1.5" /> New Booking
            </NeonButton>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {!isLoading && bookings.length > 0 && <SummaryStats bookings={bookings} />}

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap mb-6">
          {TABS.map(({ key, label }) => {
            const count = key==='all' ? bookings.length : bookings.filter((b)=>b.status===key).length;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${activeTab===key ? 'bg-brand-red/20 border-brand-red text-brand-red' : 'bg-white/5 border-white/10 text-text-sub hover:bg-white/10'}`}>
                {label}{count > 0 && <span className="ml-1.5 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} onBook={() => navigate('/booking')} />
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => <BookingCard key={b.id} booking={b} onClick={setSelectedBooking} />)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBooking && (
          <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onCancel={handleCancel} />
        )}
      </AnimatePresence>
    </div>
  );
};
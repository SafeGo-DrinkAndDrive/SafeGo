// ─── src/pages/MyBookings.tsx ─────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, MapPin, Navigation, Calendar, Clock,
  Receipt, RefreshCw, AlertCircle, Car, ArrowRight,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';
import { GlassCard }   from '../components/GlassCard';
import { NeonButton }  from '../components/NeonButton';
import { useBookings } from '../hooks/useBookings';
import type { Booking, BookingStatus } from '../types';

type TabFilter = BookingStatus | 'all';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'ongoing',   label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  confirmed: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  ongoing:   'text-brand-red  bg-brand-red/10  border-brand-red/30',
  completed: 'text-green-400  bg-green-400/10  border-green-400/30',
  cancelled: 'text-red-400    bg-red-400/10    border-red-400/30',
};

const STATUS_ICON: Record<BookingStatus, React.ReactNode> = {
  pending:   <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle className="w-3.5 h-3.5" />,
  ongoing:   <Car className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

const BookingCard: React.FC<{ booking: Booking }> = ({ booking }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    layout
  >
    <GlassCard className="p-5 hover:border-white/20 transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-xs font-mono text-text-sub mb-1">
            #{booking.id.slice(0, 12).toUpperCase()}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">
              {booking.serviceType}
              {booking.serviceDetail && (
                <span className="text-text-sub font-normal"> · {booking.serviceDetail}</span>
              )}
            </span>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize flex-shrink-0 ${STATUS_STYLE[booking.status]}`}>
          {STATUS_ICON[booking.status]}
          {booking.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-brand-red mt-0.5 flex-shrink-0" />
          <p className="text-sm text-white truncate">{booking.pickupLocation}</p>
        </div>
        <div className="flex items-start gap-2">
          <Navigation className="w-3.5 h-3.5 text-brand-gray mt-0.5 flex-shrink-0" />
          <p className="text-sm text-text-sub truncate">{booking.dropLocation}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/8">
        <div className="flex items-center gap-4 text-xs text-text-sub">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {booking.scheduledDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {booking.scheduledTime}
          </span>
          {booking.distance > 0 && (
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5" />
              {booking.distance} km
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-brand-red font-bold">
          <Receipt className="w-3.5 h-3.5" />
          <span className="text-sm">LKR {booking.fare.toLocaleString()}</span>
        </div>
      </div>
    </GlassCard>
  </motion.div>
);

const EmptyState: React.FC<{ tab: TabFilter; onBook: () => void }> = ({ tab, onBook }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-16"
  >
    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
      <ClipboardList className="w-8 h-8 text-text-sub" />
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">
      {tab === 'all' ? 'No bookings yet' : `No ${tab} bookings`}
    </h3>
    <p className="text-text-sub text-sm mb-6">
      {tab === 'all'
        ? 'Your booking history will appear here once you book a ride.'
        : `You have no bookings with status "${tab}" right now.`}
    </p>
    {tab === 'all' && (
      <NeonButton variant="primary" onClick={onBook}>
        Book Your First Ride <ArrowRight className="w-4 h-4 ml-2" />
      </NeonButton>
    )}
  </motion.div>
);

const SummaryStats: React.FC<{ bookings: Booking[] }> = ({ bookings }) => {
  const completed  = bookings.filter((b) => b.status === 'completed');
  const totalSpent = completed.reduce((s, b) => s + b.fare, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Total Rides',  value: bookings.length,    color: 'text-white' },
        { label: 'Completed',    value: completed.length,   color: 'text-green-400' },
        { label: 'Pending',      value: bookings.filter((b) => b.status === 'pending').length, color: 'text-yellow-400' },
        { label: 'Total Spent',  value: `LKR ${totalSpent.toLocaleString()}`, color: 'text-brand-red' },
      ].map(({ label, value, color }) => (
        <GlassCard key={label} className="p-4 text-center">
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-text-sub mt-0.5">{label}</p>
        </GlassCard>
      ))}
    </div>
  );
};

export const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const { bookings, isLoading, error, refresh } = useBookings();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const filtered = activeTab === 'all'
    ? bookings
    : bookings.filter((b) => b.status === activeTab);

  const countFor = (tab: TabFilter) =>
    tab === 'all' ? bookings.length : bookings.filter((b) => b.status === tab).length;

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Bookings</h1>
            <p className="text-text-sub">Your complete ride history</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-sm text-text-sub hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <NeonButton variant="primary" onClick={() => navigate('/booking')}>
              <Car className="w-4 h-4 mr-2" /> New Booking
            </NeonButton>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error} — <button onClick={refresh} className="underline">try again</button>
          </div>
        )}

        {!isLoading && bookings.length > 0 && (
          <SummaryStats bookings={bookings} />
        )}

        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {TABS.map(({ key, label }) => {
            const count = countFor(key);
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                  activeTab === key
                    ? 'bg-brand-red/15 border-brand-red text-brand-red'
                    : 'bg-white/3 border-white/10 text-text-sub hover:bg-white/8 hover:text-white'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === key ? 'bg-brand-red/30 text-brand-red' : 'bg-white/10 text-text-sub'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            <p className="text-text-sub text-sm">Loading your bookings…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {filtered.length === 0 ? (
                <EmptyState tab={activeTab} onBook={() => navigate('/booking')} />
              ) : (
                filtered.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </div>
  );
};

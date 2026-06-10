// ─── src/pages/AdminDashboard.tsx ─────────────────────────────────────────────
// Phase 3 change: Added "Fare Management" tab that renders AdminFareManager.
// All existing Bookings and Users tab logic is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Receipt,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { useAdmin } from "../hooks/useAdmin";
import { AdminFareManager } from "../components/admin/AdminFareManager";
import type { BookingStatus, Booking, AppUser } from "../types";

const ALL_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
];

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "text-yellow-400  bg-yellow-400/10  border-yellow-400/30",
  confirmed: "text-blue-400    bg-blue-400/10    border-blue-400/30",
  ongoing: "text-brand-red   bg-brand-red/10   border-brand-red/30",
  completed: "text-green-400   bg-green-400/10   border-green-400/30",
  cancelled: "text-red-400     bg-red-400/10     border-red-400/30",
};

const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ongoing", "cancelled"],
  ongoing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <GlassCard className="p-5">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-text-sub">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  </GlassCard>
);

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_STYLE[status]}`}
  >
    {status}
  </span>
);

// ── Status updater ────────────────────────────────────────────────────────────

const StatusUpdater: React.FC<{
  booking: Booking;
  onUpdate: (id: string, status: BookingStatus) => Promise<void>;
}> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const nexts = NEXT_STATUSES[booking.status];
  if (nexts.length === 0) return <StatusBadge status={booking.status} />;

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as BookingStatus;
    if (!next) return;
    setLoading(true);
    try {
      await onUpdate(booking.id, next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <StatusBadge status={booking.status} />
      <div className="relative">
        <select
          onChange={handleChange}
          disabled={loading}
          defaultValue=""
          className="appearance-none text-xs bg-white/5 border border-white/15 rounded-lg pl-2 pr-6 py-1 text-text-sub hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50 outline-none"
        >
          <option value="" disabled>
            Change
          </option>
          {nexts.map((s) => (
            <option key={s} value={s} className="bg-background capitalize">
              {s}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1 top-1.5 w-3 h-3 text-text-sub pointer-events-none" />
      </div>
      {loading && <RefreshCw className="w-3 h-3 text-text-sub animate-spin" />}
    </div>
  );
};

// ── Tab definition ────────────────────────────────────────────────────────────

type ActiveTab = "bookings" | "users" | "fares";

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "bookings",
    label: "Bookings",
    icon: <Activity className="w-4 h-4" />,
  },
  { key: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  {
    key: "fares",
    label: "Fare Management",
    icon: <Receipt className="w-4 h-4" />,
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const { bookings, users, isLoading, error, updateStatus, refresh } =
    useAdmin();
  const [activeTab, setActiveTab] = useState<ActiveTab>("bookings");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all",
  );

  const filtered =
    statusFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    ongoing: bookings.filter((b) => b.status === "ongoing").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    revenue: bookings
      .filter((b) => b.status === "completed")
      .reduce((s, b) => s + b.fare, 0),
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Admin Dashboard
            </h1>
            <p className="text-text-sub">Manage bookings, users and pricing</p>
          </div>
          {/* Refresh only makes sense on data tabs */}
          {activeTab !== "fares" && (
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm text-text-sub hover:text-white transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* ── Stats (only shown on bookings tab) ─────────────────────────── */}
        {activeTab === "bookings" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Bookings"
                value={stats.total}
                icon={<Activity className="w-5 h-5 text-brand-red" />}
                color="bg-brand-red/20"
              />
              <StatCard
                label="Pending"
                value={stats.pending}
                icon={<Clock className="w-5 h-5 text-yellow-400" />}
                color="bg-yellow-400/20"
              />
              <StatCard
                label="Ongoing"
                value={stats.ongoing}
                icon={<RefreshCw className="w-5 h-5 text-blue-400" />}
                color="bg-blue-400/20"
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
                color="bg-green-400/20"
              />
            </div>

            {/* Revenue */}
            <GlassCard className="mb-8 p-5">
              <p className="text-sm text-text-sub mb-1">
                Total Revenue (Completed)
              </p>
              <p className="text-3xl font-bold text-white">
                LKR {stats.revenue.toLocaleString()}
              </p>
            </GlassCard>
          </>
        )}

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-brand-red/20 text-brand-red"
                  : "text-text-sub hover:text-white"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* ── Bookings tab ────────────────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div>
            {/* Status filter */}
            <div className="flex gap-2 flex-wrap mb-5">
              {(["all", ...ALL_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    statusFilter === s
                      ? "bg-brand-red/20 border-brand-red text-brand-red"
                      : "bg-white/5 border-white/10 text-text-sub hover:bg-white/10"
                  }`}
                >
                  {s}
                  {s !== "all" && (
                    <span className="ml-1.5 opacity-60">
                      ({bookings.filter((b) => b.status === s).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <GlassCard>
                <p className="text-center text-text-sub py-12">
                  No bookings found.
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    layout
                  >
                    <GlassCard className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-xs font-mono text-text-sub">
                              {b.id.slice(0, 12)}…
                            </span>
                            <StatusUpdater
                              booking={b}
                              onUpdate={updateStatus}
                            />
                          </div>
                          <p className="text-white font-medium">{b.userName}</p>
                          <p className="text-sm text-text-sub mt-1">
                            <span className="text-brand-red">↑</span>{" "}
                            {b.pickupLocation}
                          </p>
                          <p className="text-sm text-text-sub">
                            <span className="text-brand-gray">↓</span>{" "}
                            {b.dropLocation}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-text-sub flex-wrap">
                            <span>
                              {b.serviceType}
                              {b.serviceDetail ? ` · ${b.serviceDetail}` : ""}
                            </span>
                            <span>{b.distance} km</span>
                            <span>
                              {b.scheduledDate} {b.scheduledTime}
                            </span>
                            {b.fareRuleId && b.fareRuleId !== "fallback" && (
                              <span className="text-brand-red/60">
                                Rule applied
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-white">
                            LKR {b.fare.toLocaleString()}
                          </p>
                          <p className="text-xs text-text-sub mt-1">
                            {new Date(b.createdAt).toLocaleDateString("en-LK")}
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users tab ───────────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <GlassCard>
                <p className="text-center text-text-sub py-12">
                  No users found.
                </p>
              </GlassCard>
            ) : (
              users.map((u: AppUser) => (
                <GlassCard key={u.uid} className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center flex-shrink-0">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-brand-red" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">
                          {u.name}
                        </p>
                        {(u.role === "admin" || u.role === "superAdmin") && (
                          <span className="text-xs px-2 py-0.5 bg-brand-red/20 text-brand-red rounded-full border border-brand-red/30">
                            {u.role}
                          </span>
                        )}
                        {u.vehicleRegistered && (
                          <span className="text-xs px-2 py-0.5 bg-green-400/10 text-green-400 rounded-full border border-green-400/20">
                            verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-sub truncate">
                        {u.email}
                      </p>
                      <p className="text-xs text-text-sub">
                        {u.phone || (
                          <span className="text-yellow-400/70">No phone</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right text-xs text-text-sub flex-shrink-0">
                      <p>Joined</p>
                      <p>{new Date(u.createdAt).toLocaleDateString("en-LK")}</p>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* ── Fare Management tab ─────────────────────────────────────────── */}
        {activeTab === "fares" && <AdminFareManager />}
      </div>
    </div>
  );
};

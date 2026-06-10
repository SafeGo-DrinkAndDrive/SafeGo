// ─── src/pages/AdminDashboard.tsx ─────────────────────────────────────────────
// New in this version:
//   • Booking date filter: Day / Week / Month / All
//   • User detail modal: view profile, suspend, ban, promote to admin, delete
//   • Admin writes user changes directly to Firestore via updateDoc / deleteDoc
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Receipt,
  X,
  MapPin,
  Navigation,
  Calendar,
  Car,
  Route,
  Shield,
  ShieldAlert,
  ShieldOff,
  Trash2,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  UserCheck,
  Ban,
} from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GlassCard } from "../components/GlassCard";
import { useAdmin } from "../hooks/useAdmin";
import { AdminFareManager } from "../components/admin/AdminFareManager";
import type { Booking, BookingStatus, AppUser, UserRole } from "../types";

// ── Date filter ───────────────────────────────────────────────────────────────

type DateFilter = "day" | "week" | "month" | "all";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "day", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

function applyDateFilter(bookings: Booking[], filter: DateFilter): Booking[] {
  if (filter === "all") return bookings;
  const now = new Date();
  const start = new Date();

  if (filter === "day") {
    start.setHours(0, 0, 0, 0);
  } else if (filter === "week") {
    const day = now.getDay(); // 0=Sun
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (filter === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return bookings.filter((b) => new Date(b.createdAt) >= start);
}

// ── Booking status config ─────────────────────────────────────────────────────

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
  value: number | string;
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

// ── Status updater ────────────────────────────────────────────────────────────

const StatusUpdater: React.FC<{
  booking: Booking;
  onUpdate: (id: string, status: BookingStatus) => Promise<void>;
}> = ({ booking, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const nexts = NEXT_STATUSES[booking.status];
  if (nexts.length === 0) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_STYLE[booking.status]}`}
      >
        {booking.status}
      </span>
    );
  }

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
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_STYLE[booking.status]}`}
      >
        {booking.status}
      </span>
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

// ── User detail modal ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  user: "Customer",
  driver: "Driver",
  admin: "Admin",
  superAdmin: "Super Admin",
};

const UserModal: React.FC<{
  user: AppUser;
  onClose: () => void;
  onUpdated: (uid: string, changes: Partial<AppUser>) => void;
  onDeleted: (uid: string) => void;
}> = ({ user, onClose, onUpdated, onDeleted }) => {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const applyChange = async (changes: Partial<AppUser>) => {
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", user.uid), changes);
      onUpdated(user.uid, changes);
      flash("User updated successfully.");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      onDeleted(user.uid);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Deletion failed.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const currentRole = user.role ?? "user";
  const isSuspended = (user as AppUser & { suspended?: boolean }).suspended;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-background-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-lg font-bold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Profile */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-brand-red">
                  {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-lg truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-xs px-2 py-0.5 bg-white/10 text-text-sub rounded-full">
                  {ROLE_LABELS[currentRole]}
                </span>
                {user.vehicleRegistered && (
                  <span className="text-xs px-2 py-0.5 bg-green-400/10 text-green-400 rounded-full border border-green-400/20">
                    Vehicle registered
                  </span>
                )}
                {isSuspended && (
                  <span className="text-xs px-2 py-0.5 bg-red-400/10 text-red-400 rounded-full border border-red-400/20">
                    Suspended
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-text-sub flex-shrink-0" />
              <span className="text-white">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-text-sub flex-shrink-0" />
              <span className={user.phone ? "text-white" : "text-yellow-400"}>
                {user.phone || "No phone number"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-text-sub flex-shrink-0" />
              <span className="text-text-sub">
                Joined{" "}
                {new Date(user.createdAt).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Management actions */}
          <div>
            <p className="text-xs text-text-sub uppercase tracking-wide mb-3">
              Account Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Verify / Unverify */}
              <button
                onClick={() =>
                  applyChange({ vehicleRegistered: !user.vehicleRegistered })
                }
                disabled={saving}
                className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-sm text-text-sub hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4 text-blue-400" />
                {user.vehicleRegistered ? "Unverify" : "Verify"} User
              </button>

              {/* Suspend / Unsuspend */}
              <button
                onClick={() =>
                  applyChange({ suspended: !isSuspended } as Partial<AppUser>)
                }
                disabled={saving}
                className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-sm text-text-sub hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4 text-yellow-400" />
                {isSuspended ? "Unsuspend" : "Suspend"} User
              </button>

              {/* Promote / Demote admin */}
              {currentRole !== "superAdmin" && (
                <button
                  onClick={() =>
                    applyChange({
                      role: currentRole === "admin" ? "user" : "admin",
                    })
                  }
                  disabled={saving}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-white/10 text-sm text-text-sub hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
                >
                  {currentRole === "admin" ? (
                    <>
                      <ShieldOff className="w-4 h-4 text-orange-400" /> Remove
                      Admin
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-green-400" /> Make Admin
                    </>
                  )}
                </button>
              )}

              {/* Ban user (set role to 'user' and suspended) */}
              <button
                onClick={() =>
                  applyChange({
                    suspended: true,
                    role: "user",
                  } as Partial<AppUser>)
                }
                disabled={saving || currentRole === "superAdmin"}
                className="flex items-center gap-2 py-2.5 px-3 rounded-xl border border-red-500/20 text-sm text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                <Ban className="w-4 h-4" /> Ban User
              </button>
            </div>
          </div>

          {/* Delete account (danger zone) */}
          <div className="border border-red-500/20 rounded-xl p-4">
            <p className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-2">
              Danger Zone
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Account Permanently
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-300">
                  This will permanently delete the user's Firestore profile.
                  This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Deleting…
                      </>
                    ) : (
                      "Yes, delete permanently"
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-text-sub text-xs hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [localUsers, setLocalUsers] = useState<AppUser[]>([]);

  // Sync localUsers when admin hook loads
  React.useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Apply both filters
  const dateFiltered = applyDateFilter(bookings, dateFilter);
  const finalFiltered =
    statusFilter === "all"
      ? dateFiltered
      : dateFiltered.filter((b) => b.status === statusFilter);

  const stats = {
    total: dateFiltered.length,
    pending: dateFiltered.filter((b) => b.status === "pending").length,
    ongoing: dateFiltered.filter((b) => b.status === "ongoing").length,
    completed: dateFiltered.filter((b) => b.status === "completed").length,
    revenue: dateFiltered
      .filter((b) => b.status === "completed")
      .reduce((s, b) => s + b.fare, 0),
  };

  const handleUserUpdated = (uid: string, changes: Partial<AppUser>) => {
    setLocalUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, ...changes } : u)),
    );
    if (selectedUser?.uid === uid)
      setSelectedUser((prev) => (prev ? { ...prev, ...changes } : null));
  };

  const handleUserDeleted = (uid: string) => {
    setLocalUsers((prev) => prev.filter((u) => u.uid !== uid));
    setSelectedUser(null);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Admin Dashboard
            </h1>
            <p className="text-text-sub">Manage bookings, users and pricing</p>
          </div>
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

        {/* Stats (bookings tab only) */}
        {activeTab === "bookings" && (
          <>
            {/* Date filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {DATE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    dateFilter === key
                      ? "bg-brand-red/20 border-brand-red text-brand-red"
                      : "bg-white/5 border-white/10 text-text-sub hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

            <GlassCard className="mb-6 p-5">
              <p className="text-sm text-text-sub mb-1">
                Revenue (Completed ·{" "}
                {DATE_FILTERS.find((f) => f.key === dateFilter)?.label})
              </p>
              <p className="text-3xl font-bold text-white">
                LKR {stats.revenue.toLocaleString()}
              </p>
            </GlassCard>
          </>
        )}

        {/* Tab bar */}
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
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── Bookings tab ──────────────────────────────────────────────── */}
        {activeTab === "bookings" && (
          <div>
            {/* Status filter chips */}
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
                  <span className="ml-1.5 opacity-60">
                    (
                    {s === "all"
                      ? dateFiltered.length
                      : dateFiltered.filter((b) => b.status === s).length}
                    )
                  </span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : finalFiltered.length === 0 ? (
              <GlassCard>
                <p className="text-center text-text-sub py-12">
                  No bookings found for this filter.
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {finalFiltered.map((b) => (
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
                          <div className="flex items-start gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-red flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-text-sub truncate">
                              {b.pickupLocation}
                            </p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-text-sub flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-text-sub truncate">
                              {b.dropLocation}
                            </p>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-text-sub flex-wrap">
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {b.serviceType}
                              {b.serviceDetail ? ` · ${b.serviceDetail}` : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Route className="w-3 h-3" /> {b.distance} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {b.scheduledDate}{" "}
                              {b.scheduledTime}
                            </span>
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

        {/* ── Users tab ──────────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : localUsers.length === 0 ? (
              <GlassCard>
                <p className="text-center text-text-sub py-12">
                  No users found.
                </p>
              </GlassCard>
            ) : (
              localUsers.map((u) => (
                <motion.button
                  key={u.uid}
                  onClick={() => setSelectedUser(u)}
                  className="w-full text-left"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-5 hover:border-white/25 hover:bg-white/5 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-brand-red/20">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-brand-red">
                            {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium truncate">
                            {u.name}
                          </p>
                          {(u.role === "admin" || u.role === "superAdmin") && (
                            <span className="text-xs px-2 py-0.5 bg-brand-red/20 text-brand-red rounded-full border border-brand-red/30">
                              {ROLE_LABELS[u.role]}
                            </span>
                          )}
                          {u.vehicleRegistered && (
                            <span className="text-xs px-2 py-0.5 bg-green-400/10 text-green-400 rounded-full border border-green-400/20">
                              verified
                            </span>
                          )}
                          {!u.phone && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-400/10 text-yellow-400 rounded-full border border-yellow-400/20">
                              no phone
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-sub truncate">
                          {u.email}
                        </p>
                      </div>
                      <div className="text-right text-xs text-text-sub flex-shrink-0">
                        <p>Joined</p>
                        <p>
                          {new Date(u.createdAt).toLocaleDateString("en-LK")}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.button>
              ))
            )}
          </div>
        )}

        {/* ── Fare Management tab ────────────────────────────────────────── */}
        {activeTab === "fares" && <AdminFareManager />}
      </div>

      {/* User detail modal */}
      <AnimatePresence>
        {selectedUser && (
          <UserModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUpdated={handleUserUpdated}
            onDeleted={handleUserDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

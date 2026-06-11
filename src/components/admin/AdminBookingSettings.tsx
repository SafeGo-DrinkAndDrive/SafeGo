// ─── src/components/admin/AdminBookingSettings.tsx ───────────────────────────
// Admin panel for configuring booking policy values stored in Firestore.
// All values here flow into the booking page and fare logic at runtime.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Clock,
  Zap,
  Timer,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  RotateCcw,
  Info,
} from "lucide-react";
import {
  getBookingPolicy,
  saveBookingPolicy,
  clearPolicyCache,
} from "../../services/bookingPolicyService";
import { useAuth } from "../../contexts/AuthContext";
import { GlassCard } from "../GlassCard";
import { NeonButton } from "../NeonButton";
import { DEFAULT_BOOKING_POLICY } from "../../types";
import type { BookingPolicy } from "../../types";

// ── Reusable field ────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  description: string;
  icon: React.ReactNode;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
}> = ({ label, description, icon, unit, value, onChange, min = 0 }) => (
  <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="p-2 bg-white/5 rounded-lg flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-text-sub mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 text-right bg-background-darker/70 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-brand-red transition-all"
      />
      <span className="text-xs text-text-sub w-10">{unit}</span>
    </div>
  </div>
);

// ── Live preview ──────────────────────────────────────────────────────────────

const PolicyPreview: React.FC<{
  p: Omit<BookingPolicy, "updatedAt" | "updatedBy">;
}> = ({ p }) => {
  const scenarios = [
    {
      label: "Blocked",
      desc: `Pickup < ${p.minAdvanceMins} min away`,
      color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    {
      label: "Immediate",
      desc: `Pickup ${p.minAdvanceMins}–${p.immediateThresholdMins} min away → LKR ${p.immediateBaseFare.toLocaleString()} flat`,
      color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
      label: "Standard",
      desc: `Pickup ≥ ${p.immediateThresholdMins} min away → distance-based fare`,
      color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
  ];

  // Surcharge example: 50 min extra
  const extra = 50;
  const billable = Math.max(0, extra - p.freeWaitingMins);
  const blocks = Math.ceil(billable / p.waitingIntervalMins);
  const charge = blocks * p.waitingChargePerInterval;

  return (
    <div className="space-y-4">
      {/* Booking window scenarios */}
      <div>
        <p className="text-xs text-text-sub uppercase tracking-wide mb-2">
          Booking Window Preview
        </p>
        <div className="space-y-2">
          {scenarios.map(({ label, desc, color }) => (
            <div
              key={label}
              className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs ${color}`}
            >
              <span className="font-bold flex-shrink-0">{label}</span>
              <span className="opacity-80">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Surcharge example */}
      <div>
        <p className="text-xs text-text-sub uppercase tracking-wide mb-2">
          Surcharge Example (50 min over estimate)
        </p>
        <div className="bg-white/3 border border-white/8 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between text-text-sub">
            <span>Extra time</span>
            <span>50 min</span>
          </div>
          <div className="flex justify-between text-text-sub">
            <span>Free grace</span>
            <span>−{p.freeWaitingMins} min</span>
          </div>
          <div className="flex justify-between text-text-sub">
            <span>Billable</span>
            <span>{billable} min</span>
          </div>
          <div className="flex justify-between text-text-sub">
            <span>
              Blocks (ceil {billable}/{p.waitingIntervalMins})
            </span>
            <span>{blocks}</span>
          </div>
          <div className="flex justify-between text-white font-semibold pt-1 border-t border-white/8 mt-1">
            <span>Surcharge</span>
            <span className="text-brand-red">
              LKR {charge.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const AdminBookingSettings: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All values stored as strings to avoid double-zero bug
  const [minAdvance, setMinAdvance] = useState(
    String(DEFAULT_BOOKING_POLICY.minAdvanceMins),
  );
  const [immThreshold, setImmThreshold] = useState(
    String(DEFAULT_BOOKING_POLICY.immediateThresholdMins),
  );
  const [immFare, setImmFare] = useState(
    String(DEFAULT_BOOKING_POLICY.immediateBaseFare),
  );
  const [freeWaiting, setFreeWaiting] = useState(
    String(DEFAULT_BOOKING_POLICY.freeWaitingMins),
  );
  const [waitInterval, setWaitInterval] = useState(
    String(DEFAULT_BOOKING_POLICY.waitingIntervalMins),
  );
  const [waitCharge, setWaitCharge] = useState(
    String(DEFAULT_BOOKING_POLICY.waitingChargePerInterval),
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);

  useEffect(() => {
    getBookingPolicy()
      .then((p) => {
        setMinAdvance(String(p.minAdvanceMins));
        setImmThreshold(String(p.immediateThresholdMins));
        setImmFare(String(p.immediateBaseFare));
        setFreeWaiting(String(p.freeWaitingMins));
        setWaitInterval(String(p.waitingIntervalMins));
        setWaitCharge(String(p.waitingChargePerInterval));
        setLastUpdated(p.updatedAt);
        setLastUpdatedBy(p.updatedBy);
      })
      .finally(() => setLoading(false));
  }, []);

  const parse = (s: string, fallback: number): number => {
    const n = parseFloat(s);
    return isNaN(n) || n < 0 ? fallback : n;
  };

  const currentPolicy: Omit<BookingPolicy, "updatedAt" | "updatedBy"> = {
    minAdvanceMins: parse(minAdvance, 40),
    immediateThresholdMins: parse(immThreshold, 90),
    immediateBaseFare: parse(immFare, 3000),
    freeWaitingMins: parse(freeWaiting, 15),
    waitingIntervalMins: parse(waitInterval, 15),
    waitingChargePerInterval: parse(waitCharge, 300),
  };

  const handleSave = async () => {
    const p = currentPolicy;
    if (p.minAdvanceMins >= p.immediateThresholdMins) {
      setError(
        "Minimum advance time must be less than the immediate booking threshold.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBookingPolicy(p, user?.uid ?? "admin");
      clearPolicyCache();
      setLastUpdated(new Date().toISOString());
      setLastUpdatedBy(user?.name ?? "admin");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMinAdvance(String(DEFAULT_BOOKING_POLICY.minAdvanceMins));
    setImmThreshold(String(DEFAULT_BOOKING_POLICY.immediateThresholdMins));
    setImmFare(String(DEFAULT_BOOKING_POLICY.immediateBaseFare));
    setFreeWaiting(String(DEFAULT_BOOKING_POLICY.freeWaitingMins));
    setWaitInterval(String(DEFAULT_BOOKING_POLICY.waitingIntervalMins));
    setWaitCharge(String(DEFAULT_BOOKING_POLICY.waitingChargePerInterval));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-red" />
            Booking Settings
          </h2>
          <p className="text-sm text-text-sub mt-0.5">
            Control booking time rules, immediate pricing, and waiting
            surcharges. Changes take effect immediately — no code deploy needed.
          </p>
        </div>
        {lastUpdated && lastUpdatedBy && (
          <p className="text-xs text-text-sub text-right flex-shrink-0">
            Last saved
            <br />
            <span className="text-white">
              {new Date(lastUpdated).toLocaleDateString("en-LK")}
            </span>
            <br />
            by {lastUpdatedBy === "system" ? "system default" : lastUpdatedBy}
          </p>
        )}
      </div>

      {/* Feedback */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3"
        >
          <CheckCircle className="w-4 h-4" /> Settings saved — live immediately
          for all new bookings.
        </motion.div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs hover:underline"
          >
            dismiss
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: settings */}
        <div className="space-y-4">
          {/* Booking Time Rules */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-brand-red" />
              <h3 className="text-sm font-semibold text-white">
                Booking Time Rules
              </h3>
            </div>
            <p className="text-xs text-text-sub mb-4">
              Define when bookings are blocked, classified as immediate, or
              treated as standard.
            </p>
            <Field
              label="Minimum Advance Booking Time"
              description="Bookings with pickup closer than this are blocked."
              icon={<AlertCircle className="w-4 h-4 text-red-400" />}
              unit="min"
              value={minAdvance}
              onChange={setMinAdvance}
              min={1}
            />
            <Field
              label="Immediate Booking Threshold"
              description="Pickup within this many minutes → immediate booking. Must be greater than minimum."
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              unit="min"
              value={immThreshold}
              onChange={setImmThreshold}
              min={1}
            />
          </GlassCard>

          {/* Immediate Booking Pricing */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Immediate Booking Pricing
              </h3>
            </div>
            <p className="text-xs text-text-sub mb-4">
              This flat rate replaces the distance-based fare for immediate
              bookings.
            </p>
            <Field
              label="Immediate Booking Base Fare"
              description="Fixed LKR amount charged for all immediate bookings regardless of distance."
              icon={<DollarSign className="w-4 h-4 text-amber-400" />}
              unit="LKR"
              value={immFare}
              onChange={setImmFare}
              min={0}
            />
          </GlassCard>

          {/* Waiting Surcharge */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                Waiting Time Surcharge
              </h3>
            </div>
            <p className="text-xs text-text-sub mb-4">
              Applied when the actual trip duration exceeds the Google Maps
              estimate.
            </p>
            <Field
              label="Free Waiting Grace Period"
              description="Minutes of additional time given for free before surcharges apply."
              icon={<Timer className="w-4 h-4 text-green-400" />}
              unit="min"
              value={freeWaiting}
              onChange={setFreeWaiting}
              min={0}
            />
            <Field
              label="Waiting Charge Interval"
              description="Each block of this many minutes is charged after the free period."
              icon={<Timer className="w-4 h-4 text-blue-400" />}
              unit="min"
              value={waitInterval}
              onChange={setWaitInterval}
              min={1}
            />
            <Field
              label="Charge per Interval"
              description="LKR amount charged per waiting block after the free grace period."
              icon={<DollarSign className="w-4 h-4 text-blue-400" />}
              unit="LKR"
              value={waitCharge}
              onChange={setWaitCharge}
              min={0}
            />
          </GlassCard>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-text-sub p-3 bg-white/3 border border-white/8 rounded-xl">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Changes are cached for 5 minutes on the client. Users may see old
            values briefly after saving.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <NeonButton
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving…
                </>
              ) : (
                "Save Settings"
              )}
            </NeonButton>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-text-sub text-sm hover:bg-white/5 hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div>
          <GlassCard>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-text-sub" />
              Live Preview
            </h3>
            <PolicyPreview p={currentPolicy} />
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

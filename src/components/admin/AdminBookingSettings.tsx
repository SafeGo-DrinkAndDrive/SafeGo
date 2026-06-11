// ─── src/components/admin/AdminBookingSettings.tsx ───────────────────────────
// Fixed: removed all references to immediateBaseFare — that field was moved
// to the Firestore /fareRules collection (serviceType: 'Immediate Distance').
// The Immediate Booking Rate card is replaced with a info notice pointing
// admins to Fare Management to configure immediate pricing.
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
  Package,
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

const ALL_HOURLY_OPTIONS = ["1h", "2h", "3h", "4h", "5h", "6h", "8h"];
const ALL_FULLDAY_OPTIONS = ["6h", "12h", "24h", "48h"];

// ── Reusable numeric field ────────────────────────────────────────────────────

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

// ── Slot toggle ───────────────────────────────────────────────────────────────

const SlotToggle: React.FC<{
  allOptions: string[];
  selected: string[];
  onChange: (slots: string[]) => void;
  minSelect?: number;
}> = ({ allOptions, selected, onChange, minSelect = 1 }) => {
  const toggle = (slot: string) => {
    if (selected.includes(slot)) {
      if (selected.length <= minSelect) return;
      onChange(selected.filter((s) => s !== slot));
    } else {
      onChange([...selected, slot].sort((a, b) => parseInt(a) - parseInt(b)));
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {allOptions.map((slot) => {
        const active = selected.includes(slot);
        return (
          <button
            key={slot}
            type="button"
            onClick={() => toggle(slot)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              active
                ? "bg-brand-red/20 border-brand-red text-brand-red"
                : "bg-white/5 border-white/10 text-text-sub hover:bg-white/10 hover:text-white"
            }`}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
};

// ── Live preview ──────────────────────────────────────────────────────────────

const PolicyPreview: React.FC<{
  p: Omit<BookingPolicy, "updatedAt" | "updatedBy">;
}> = ({ p }) => {
  const scenarios = [
    {
      label: "Blocked",
      desc: `< ${p.minAdvanceMins} min away`,
      color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    {
      label: "Immediate",
      desc: `${p.minAdvanceMins}–${p.immediateThresholdMins} min → Immediate Distance rule`,
      color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
      label: "Standard",
      desc: `≥ ${p.immediateThresholdMins} min → Distance rule`,
      color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
  ];

  const billable = Math.max(0, 50 - p.freeWaitingMins);
  const blocks = Math.ceil(billable / p.waitingIntervalMins);
  const charge = blocks * p.waitingChargePerInterval;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-text-sub uppercase tracking-wide mb-2">
          Booking Window
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

      <div>
        <p className="text-xs text-text-sub uppercase tracking-wide mb-2">
          Surcharge (50 min over)
        </p>
        <div className="bg-white/3 border border-white/8 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between text-text-sub">
            <span>Extra</span>
            <span>50 min</span>
          </div>
          <div className="flex justify-between text-text-sub">
            <span>Free</span>
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

      <div>
        <p className="text-xs text-text-sub uppercase tracking-wide mb-2">
          Package Slots Preview
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-sub w-16 flex-shrink-0">
              Hourly
            </span>
            <div className="flex flex-wrap gap-1">
              {p.hourlySlots.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-brand-red/10 text-brand-red text-xs rounded border border-brand-red/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-sub w-16 flex-shrink-0">
              Full Day
            </span>
            <div className="flex flex-wrap gap-1">
              {p.fullDaySlots.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 bg-blue-400/10 text-blue-400 text-xs rounded border border-blue-400/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

export const AdminBookingSettings: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [lastSavedBy, setLastSavedBy] = useState<string | null>(null);

  // All stored as strings to avoid double-zero bug
  const [minAdvance, setMinAdvance] = useState(
    String(DEFAULT_BOOKING_POLICY.minAdvanceMins),
  );
  const [immThreshold, setImmThreshold] = useState(
    String(DEFAULT_BOOKING_POLICY.immediateThresholdMins),
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
  const [hourlySlots, setHourlySlots] = useState<string[]>(
    DEFAULT_BOOKING_POLICY.hourlySlots,
  );
  const [fullDaySlots, setFullDaySlots] = useState<string[]>(
    DEFAULT_BOOKING_POLICY.fullDaySlots,
  );

  useEffect(() => {
    getBookingPolicy()
      .then((p) => {
        setMinAdvance(String(p.minAdvanceMins));
        setImmThreshold(String(p.immediateThresholdMins));
        setFreeWaiting(String(p.freeWaitingMins));
        setWaitInterval(String(p.waitingIntervalMins));
        setWaitCharge(String(p.waitingChargePerInterval));
        setHourlySlots(p.hourlySlots);
        setFullDaySlots(p.fullDaySlots);
        setLastSaved(p.updatedAt);
        setLastSavedBy(p.updatedBy);
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
    freeWaitingMins: parse(freeWaiting, 15),
    waitingIntervalMins: parse(waitInterval, 15),
    waitingChargePerInterval: parse(waitCharge, 300),
    hourlySlots,
    fullDaySlots,
  };

  const handleSave = async () => {
    const p = currentPolicy;
    if (p.minAdvanceMins >= p.immediateThresholdMins) {
      setError(
        "Minimum advance time must be less than the immediate booking threshold.",
      );
      return;
    }
    if (hourlySlots.length === 0) {
      setError("Select at least one hourly slot.");
      return;
    }
    if (fullDaySlots.length === 0) {
      setError("Select at least one full-day slot.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveBookingPolicy(p, user?.uid ?? "admin");
      clearPolicyCache();
      setLastSaved(new Date().toISOString());
      setLastSavedBy(user?.name ?? "admin");
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
    setFreeWaiting(String(DEFAULT_BOOKING_POLICY.freeWaitingMins));
    setWaitInterval(String(DEFAULT_BOOKING_POLICY.waitingIntervalMins));
    setWaitCharge(String(DEFAULT_BOOKING_POLICY.waitingChargePerInterval));
    setHourlySlots(DEFAULT_BOOKING_POLICY.hourlySlots);
    setFullDaySlots(DEFAULT_BOOKING_POLICY.fullDaySlots);
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
            <Settings className="w-5 h-5 text-brand-red" /> Booking Settings
          </h2>
          <p className="text-sm text-text-sub mt-0.5">
            Booking time rules, waiting surcharges, and package slots.
          </p>
        </div>
        {lastSaved && (
          <p className="text-xs text-text-sub text-right flex-shrink-0">
            Last saved
            <br />
            <span className="text-white">
              {new Date(lastSaved).toLocaleDateString("en-LK")}
            </span>
            <br />
            by {lastSavedBy === "system" ? "system default" : lastSavedBy}
          </p>
        )}
      </div>

      {/* Feedback */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3"
        >
          <CheckCircle className="w-4 h-4" /> Settings saved — live for all new
          bookings.
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
        {/* ── Left: config ── */}
        <div className="space-y-4">
          {/* Time Rules */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-brand-red" />
              <h3 className="text-sm font-semibold text-white">
                Booking Time Rules
              </h3>
            </div>
            <p className="text-xs text-text-sub mb-3">
              Define when bookings are blocked, immediate, or standard.
            </p>
            <Field
              label="Minimum Advance Time"
              description="Bookings closer than this are blocked entirely."
              icon={<AlertCircle className="w-4 h-4 text-red-400" />}
              unit="min"
              value={minAdvance}
              onChange={setMinAdvance}
              min={1}
            />
            <Field
              label="Immediate Booking Threshold"
              description="Pickup within this window → immediate booking engine."
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              unit="min"
              value={immThreshold}
              onChange={setImmThreshold}
              min={1}
            />
          </GlassCard>

          {/* Immediate pricing info — points to Fare Management */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Immediate Booking Pricing
              </h3>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Immediate booking fares are managed separately under{" "}
                <span className="font-semibold text-amber-300">
                  Fare Management → Immediate Distance
                </span>
                . Create an active Immediate Distance rule there to set base
                charges and per-km rates for immediate bookings.
              </p>
            </div>
          </GlassCard>

          {/* Waiting Surcharge */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                Waiting Time Surcharge
              </h3>
            </div>
            <p className="text-xs text-text-sub mb-3">
              Applies to{" "}
              <span className="text-white font-medium">standard Distance</span>{" "}
              bookings only when actual trip exceeds estimate.
            </p>
            <Field
              label="Free Grace Period"
              description="Extra minutes given free before surcharges."
              icon={<Timer className="w-4 h-4 text-green-400" />}
              unit="min"
              value={freeWaiting}
              onChange={setFreeWaiting}
              min={0}
            />
            <Field
              label="Billing Interval"
              description="Each block of this many minutes is charged."
              icon={<Timer className="w-4 h-4 text-blue-400" />}
              unit="min"
              value={waitInterval}
              onChange={setWaitInterval}
              min={1}
            />
            <Field
              label="Charge per Interval"
              description="LKR added per block after grace period."
              icon={<DollarSign className="w-4 h-4 text-blue-400" />}
              unit="LKR"
              value={waitCharge}
              onChange={setWaitCharge}
              min={0}
            />
          </GlassCard>

          {/* Package Slots */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">
                Package Duration Slots
              </h3>
            </div>
            <p className="text-xs text-text-sub mb-4">
              Choose which duration options appear in the booking page. The
              active Fare Rule's{" "}
              <code className="text-brand-red text-xs">flatRates</code> must
              include rates for every enabled slot.
            </p>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white">
                  Hourly Packages
                </p>
                <p className="text-xs text-text-sub">
                  {hourlySlots.length} selected
                </p>
              </div>
              <SlotToggle
                allOptions={ALL_HOURLY_OPTIONS}
                selected={hourlySlots}
                onChange={setHourlySlots}
                minSelect={1}
              />
              <p className="text-xs text-text-sub mt-1.5">
                Select at least 1. Range: 1h–8h.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white">
                  Full Day Packages
                </p>
                <p className="text-xs text-text-sub">
                  {fullDaySlots.length} selected
                </p>
              </div>
              <SlotToggle
                allOptions={ALL_FULLDAY_OPTIONS}
                selected={fullDaySlots}
                onChange={setFullDaySlots}
                minSelect={1}
              />
              <p className="text-xs text-text-sub mt-1.5">
                Select at least 1. Available: 6h, 12h, 24h, 48h.
              </p>
            </div>
          </GlassCard>

          <div className="flex items-start gap-2 text-xs text-text-sub p-3 bg-white/3 border border-white/8 rounded-xl">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Changes are cached for 5 minutes client-side. New bookings after
            that use the updated settings.
          </div>

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
              <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
            </button>
          </div>
        </div>

        {/* ── Right: live preview ── */}
        <div>
          <GlassCard>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-text-sub" /> Live Preview
            </h3>
            <PolicyPreview p={currentPolicy} />
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

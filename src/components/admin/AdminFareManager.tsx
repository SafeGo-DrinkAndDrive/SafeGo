// ─── src/components/admin/AdminFareManager.tsx ───────────────────────────────
// Fixes in this version:
//   1. Firestore undefined error: tiers/flatRates now omitted via spread instead
//      of being set to undefined (Firestore rejects undefined field values).
//   2. Double-zero keyboard bug: all numeric inputs are controlled as strings
//      internally, only converted to numbers when saving. This lets the user
//      clear the field and type freely without the input fighting them.
//   3. Live preview slider removed — replaced with a plain number text input.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Power,
  PowerOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
} from "lucide-react";
import {
  getAllFareRules,
  createFareRule,
  updateFareRule,
  setActiveRule,
  disableFareRule,
  type CreateFareRulePayload,
} from "../../services/fareRulesService";
import { useAuth } from "../../contexts/AuthContext";
import { GlassCard } from "../GlassCard";
import { NeonButton } from "../NeonButton";
import type { FareRule, FareRuleTier, ServiceType } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) || n < 0 ? 0 : n;
}

function previewTieredFare(km: number, tiers: FareRuleTier[]): number {
  if (!tiers.length) return 0;
  const sorted = [...tiers].sort((a, b) => a.minKm - b.minKm);
  let tier = sorted[0];
  for (const t of sorted) {
    if (km >= t.minKm) tier = t;
  }
  return tier.baseCharge + Math.round(km * tier.ratePerKm);
}

// ── String-based tier state ───────────────────────────────────────────────────

interface TierStr {
  minKm: string;
  maxKm: string;
  baseCharge: string;
  ratePerKm: string;
}

function tierToStr(t: FareRuleTier): TierStr {
  return {
    minKm: String(t.minKm),
    maxKm: String(t.maxKm),
    baseCharge: String(t.baseCharge),
    ratePerKm: String(t.ratePerKm),
  };
}

function strToTier(s: TierStr): FareRuleTier {
  return {
    minKm: parseNum(s.minKm),
    maxKm: parseNum(s.maxKm),
    baseCharge: parseNum(s.baseCharge),
    ratePerKm: parseNum(s.ratePerKm),
  };
}

const DEFAULT_TIERS_STR: TierStr[] = [
  { minKm: "0", maxKm: "10", baseCharge: "500", ratePerKm: "150" },
  { minKm: "10", maxKm: "20", baseCharge: "0", ratePerKm: "130" },
  { minKm: "20", maxKm: "30", baseCharge: "0", ratePerKm: "110" },
  { minKm: "30", maxKm: "9999", baseCharge: "0", ratePerKm: "100" },
];

// ── Shared input class ────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-background-darker/60 border border-white/10 rounded-lg px-3 py-2 " +
  "text-white text-sm outline-none focus:border-brand-red transition-all";

// ── Tier editor row ────────────────────────────────────────────────────────────

const TierRow: React.FC<{
  tier: TierStr;
  index: number;
  isLast: boolean;
  onChange: (index: number, field: keyof TierStr, value: string) => void;
  onRemove: (index: number) => void;
}> = ({ tier, index, isLast, onChange, onRemove }) => (
  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end mb-2">
    <div>
      <label className="block text-xs text-text-sub mb-1">Min km</label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={tier.minKm}
        onChange={(e) => onChange(index, "minKm", e.target.value)}
        className={inputCls}
      />
    </div>
    <div>
      <label className="block text-xs text-text-sub mb-1">
        Max km {isLast && <span className="text-text-sub/50">(∞)</span>}
      </label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={isLast ? "9999" : tier.maxKm}
        disabled={isLast}
        onChange={(e) => onChange(index, "maxKm", e.target.value)}
        className={`${inputCls} ${isLast ? "opacity-40 cursor-not-allowed" : ""}`}
      />
    </div>
    <div>
      <label className="block text-xs text-text-sub mb-1">Base (LKR)</label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={tier.baseCharge}
        onChange={(e) => onChange(index, "baseCharge", e.target.value)}
        className={inputCls}
        placeholder="0"
      />
    </div>
    <div>
      <label className="block text-xs text-text-sub mb-1">LKR / km</label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={tier.ratePerKm}
        onChange={(e) => onChange(index, "ratePerKm", e.target.value)}
        className={inputCls}
        placeholder="0"
      />
    </div>
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="mb-0.5 p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
      title="Remove tier"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

// ── Flat rates editor ─────────────────────────────────────────────────────────

const HOURLY_SLOTS = ["1h", "2h", "3h", "4h", "6h", "12h"];
const FULLDAY_SLOTS = ["4h", "6h", "8h", "10h", "12h"];

type FlatRatesStr = Record<string, string>;

const FlatRatesEditor: React.FC<{
  serviceType: "Hourly" | "Full Day";
  rates: FlatRatesStr;
  onChange: (rates: FlatRatesStr) => void;
}> = ({ serviceType, rates, onChange }) => {
  const slots = serviceType === "Hourly" ? HOURLY_SLOTS : FULLDAY_SLOTS;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {slots.map((slot) => (
        <div key={slot}>
          <label className="block text-xs text-text-sub mb-1">{slot}</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-text-sub pointer-events-none">
              LKR
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={rates[slot] ?? ""}
              placeholder="0"
              onChange={(e) => onChange({ ...rates, [slot]: e.target.value })}
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Rule form ─────────────────────────────────────────────────────────────────

interface RuleFormProps {
  initial?: FareRule;
  onSave: (rule: FareRule) => void;
  onCancel: () => void;
  adminUid: string;
}

const RuleForm: React.FC<RuleFormProps> = ({
  initial,
  onSave,
  onCancel,
  adminUid,
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [serviceType, setServiceType] = useState<ServiceType>(
    initial?.serviceType ?? "Distance",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKmStr, setPreviewKmStr] = useState("15");

  const [tierStrs, setTierStrs] = useState<TierStr[]>(
    initial?.tiers ? initial.tiers.map(tierToStr) : DEFAULT_TIERS_STR,
  );

  const [flatRatesStr, setFlatRatesStr] = useState<FlatRatesStr>(() => {
    if (!initial?.flatRates) return {};
    return Object.fromEntries(
      Object.entries(initial.flatRates).map(([k, v]) => [k, String(v)]),
    );
  });

  const previewKm = parseNum(previewKmStr);
  const previewFare =
    serviceType === "Distance"
      ? previewTieredFare(previewKm, tierStrs.map(strToTier))
      : 0;

  const updateTier = (i: number, field: keyof TierStr, value: string) =>
    setTierStrs((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)),
    );

  const removeTier = (i: number) =>
    setTierStrs((prev) => prev.filter((_, idx) => idx !== i));

  const addTier = () => {
    const last = tierStrs[tierStrs.length - 1];
    const newMin = parseNum(last.minKm) + 10;
    setTierStrs([
      ...tierStrs.slice(0, -1),
      { ...last, maxKm: String(newMin) },
      {
        minKm: String(newMin),
        maxKm: "9999",
        baseCharge: "0",
        ratePerKm: last.ratePerKm,
      },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Rule name is required.");
      return;
    }
    if (serviceType === "Distance" && tierStrs.length === 0) {
      setError("At least one distance tier is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tiers = tierStrs.map(strToTier);
      const flatRates = Object.fromEntries(
        Object.entries(flatRatesStr).map(([k, v]) => [k, parseNum(v)]),
      );

      // FIX: spread to omit the unused field entirely — Firestore rejects undefined
      const payload: CreateFareRulePayload = {
        name: name.trim(),
        serviceType,
        description: description.trim(),
        isActive: initial?.isActive ?? false,
        createdBy: adminUid,
        ...(serviceType === "Distance" ? { tiers } : { flatRates }),
      };

      let saved: FareRule;
      if (initial) {
        await updateFareRule(initial.id, payload);
        saved = { ...initial, ...payload, updatedAt: new Date().toISOString() };
      } else {
        saved = await createFareRule(payload, adminUid);
      }
      onSave(saved);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard glowColor="red">
      <h3 className="text-lg font-semibold text-white mb-5">
        {initial ? "Edit Fare Rule" : "Create Fare Rule"}
      </h3>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Name + service type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
              Rule Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Distance Rate"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
              Service Type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className={inputCls}
            >
              <option value="Distance">Distance</option>
              <option value="Hourly">Hourly</option>
              <option value="Full Day">Full Day</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
            Description <span className="text-text-sub/50">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Standard weekend rate"
            className={inputCls}
          />
        </div>

        {/* Distance tiers */}
        {serviceType === "Distance" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-text-sub uppercase tracking-wide">
                Distance tiers
              </label>
              <button
                type="button"
                onClick={addTier}
                className="flex items-center gap-1 text-xs text-brand-red hover:underline"
              >
                <Plus className="w-3 h-3" /> Add tier
              </button>
            </div>

            <div className="bg-black/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2 text-xs text-blue-300 mb-3">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                The rate of the tier the total distance falls into is applied to
                the whole journey.
              </div>
              {tierStrs.map((tier, i) => (
                <TierRow
                  key={i}
                  tier={tier}
                  index={i}
                  isLast={i === tierStrs.length - 1}
                  onChange={updateTier}
                  onRemove={removeTier}
                />
              ))}
            </div>

            {/* Fare preview — text input, no slider */}
            <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">Fare preview</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-sub">km</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={previewKmStr}
                    onChange={(e) => setPreviewKmStr(e.target.value)}
                    className="w-20 bg-background-darker/60 border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-brand-red text-right"
                    placeholder="15"
                  />
                </div>
              </div>
              <p className="text-2xl font-bold text-brand-red">
                LKR {previewFare.toLocaleString()}
              </p>
              <p className="text-xs text-text-sub mt-0.5">
                Estimated fare for {previewKm} km
              </p>
            </div>
          </div>
        )}

        {/* Flat rates */}
        {serviceType !== "Distance" && (
          <div>
            <label className="block text-xs text-text-sub uppercase tracking-wide mb-3">
              Flat rates by duration
            </label>
            <FlatRatesEditor
              serviceType={serviceType as "Hourly" | "Full Day"}
              rates={flatRatesStr}
              onChange={setFlatRatesStr}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <NeonButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving…
              </>
            ) : (
              "Save Rule"
            )}
          </NeonButton>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-text-sub text-sm hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </GlassCard>
  );
};

// ── Rule card ─────────────────────────────────────────────────────────────────

const RuleCard: React.FC<{
  rule: FareRule;
  onEdit: (rule: FareRule) => void;
  onActivate: (rule: FareRule) => void;
  onDisable: (rule: FareRule) => void;
  loading: boolean;
}> = ({ rule, onEdit, onActivate, onDisable, loading }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all ${
        rule.isActive
          ? "border-brand-red/40 bg-brand-red/5"
          : "border-white/10 bg-white/3"
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.isActive ? "bg-green-400" : "bg-white/20"}`}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {rule.name}
            </p>
            <p className="text-xs text-text-sub">
              {rule.serviceType}
              {rule.description ? ` · ${rule.description}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {rule.isActive && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-400/10 text-green-400 border border-green-400/20">
              Active
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1.5 text-text-sub hover:text-white transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="p-1.5 text-text-sub hover:text-white transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {rule.isActive ? (
            <button
              onClick={() => onDisable(rule)}
              disabled={loading}
              className="p-1.5 text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50"
            >
              <PowerOff className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onActivate(rule)}
              disabled={loading}
              className="p-1.5 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
            >
              <Power className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              {rule.serviceType === "Distance" && rule.tiers?.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-text-sub">
                      <th className="text-left pb-1.5 font-medium">
                        Distance band
                      </th>
                      <th className="text-right pb-1.5 font-medium">
                        Base charge
                      </th>
                      <th className="text-right pb-1.5 font-medium">
                        Rate / km
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rule.tiers.map((tier, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-1.5 text-white">
                          {tier.minKm}–{tier.maxKm >= 9999 ? "∞" : tier.maxKm}{" "}
                          km
                        </td>
                        <td className="py-1.5 text-right text-text-sub">
                          LKR {tier.baseCharge.toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right text-white font-medium">
                          LKR {tier.ratePerKm}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : rule.flatRates ? (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(rule.flatRates).map(([slot, price]) => (
                    <div
                      key={slot}
                      className="bg-white/5 rounded-lg p-2 text-center"
                    >
                      <p className="text-xs text-text-sub">{slot}</p>
                      <p className="text-sm font-semibold text-white">
                        LKR {price.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-sub">No pricing data.</p>
              )}
              <p className="text-xs text-text-sub mt-2">
                Created {new Date(rule.createdAt).toLocaleDateString()}
                {rule.updatedAt !== rule.createdAt &&
                  ` · Updated ${new Date(rule.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const AdminFareManager: React.FC = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<FareRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FareRule | undefined>(undefined);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await getAllFareRules());
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleActivate = async (rule: FareRule) => {
    setActioning(true);
    try {
      await setActiveRule(rule.id, rule.serviceType);
      await loadRules();
      flash(`"${rule.name}" is now the active ${rule.serviceType} rule.`);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setActioning(false);
    }
  };

  const handleDisable = async (rule: FareRule) => {
    setActioning(true);
    try {
      await disableFareRule(rule.id);
      await loadRules();
      flash(`"${rule.name}" has been disabled.`);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setActioning(false);
    }
  };

  const handleSaved = (saved: FareRule) => {
    setShowForm(false);
    setEditing(undefined);
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    flash(editing ? "Rule updated." : "New rule created.");
  };

  const grouped = (["Distance", "Hourly", "Full Day"] as ServiceType[]).map(
    (st) => ({
      serviceType: st,
      rules: rules.filter((r) => r.serviceType === st),
      activeRule: rules.find((r) => r.serviceType === st && r.isActive),
    }),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-red" />
            Fare Management
          </h2>
          <p className="text-sm text-text-sub mt-0.5">
            Create and manage dynamic pricing rules. Only one rule can be active
            per service type.
          </p>
        </div>
        <NeonButton
          variant="primary"
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> New Rule
        </NeonButton>
      </div>

      {/* Flash messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3"
          >
            <CheckCircle className="w-4 h-4" /> {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-4 h-4" /> {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs hover:underline"
            >
              dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {(showForm || editing !== undefined) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <RuleForm
              initial={editing}
              adminUid={user?.uid ?? ""}
              onSave={handleSaved}
              onCancel={() => {
                setShowForm(false);
                setEditing(undefined);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ serviceType, rules: group, activeRule }) => (
            <div key={serviceType}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                  {serviceType}
                </h3>
                {activeRule ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                    <Zap className="w-3 h-3" /> {activeRule.name}
                  </span>
                ) : (
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                    No active rule — fallback pricing in use
                  </span>
                )}
              </div>
              {group.length === 0 ? (
                <div className="text-sm text-text-sub border border-white/5 rounded-xl px-4 py-6 text-center">
                  No rules yet for {serviceType}. Create one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {group.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      loading={actioning}
                      onEdit={(r) => {
                        setEditing(r);
                        setShowForm(false);
                      }}
                      onActivate={handleActivate}
                      onDisable={handleDisable}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

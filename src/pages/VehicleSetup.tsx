// ─── src/pages/VehicleSetup.tsx ──────────────────────────────────────────────
// 3-step vehicle registration wizard.
//
// Step 1 — Vehicle Details   (type, make, model, year, plate, color)
// Step 2 — Insurance Details (provider, policy #, expiry)
// Step 3 — License Details   (license #, expiry)
//
// On submit:
//  • Writes to /users/{uid}/vehicles/{autoId} in Firestore
//  • Sets vehicleRegistered: true on /users/{uid}
//  • Calls refreshProfile() so AuthContext reflects the change instantly
//  • Redirects to /booking
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, Shield, FileText, CheckCircle, AlertCircle,
  ChevronRight, ChevronLeft, Loader2,
} from 'lucide-react';
import { GlassCard }     from '../components/GlassCard';
import { NeonButton }    from '../components/NeonButton';
import { useAuth }       from '../contexts/AuthContext';
import { registerVehicle } from '../services/vehicleService';
import type { VehicleType } from '../types';

// ── Step config ────────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Vehicle',   icon: Car },
  { number: 2, label: 'Insurance', icon: Shield },
  { number: 3, label: 'License',   icon: FileText },
];

const VEHICLE_TYPES: VehicleType[] = ['Car', 'SUV', 'Van', 'Pickup'];
const COLORS = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Gold', 'Other'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  // Step 1
  vehicleType: VehicleType;
  make:        string;
  model:       string;
  year:        string;
  plateNumber: string;
  color:       string;
  // Step 2
  insProvider:  string;
  insPolicy:    string;
  insExpiry:    string;
  // Step 3
  licNumber: string;
  licExpiry: string;
}

const INITIAL: FormState = {
  vehicleType: 'Car',
  make:        '',
  model:       '',
  year:        String(CURRENT_YEAR),
  plateNumber: '',
  color:       'White',
  insProvider: '',
  insPolicy:   '',
  insExpiry:   '',
  licNumber:   '',
  licExpiry:   '',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Field: React.FC<{
  label:       string;
  required?:   boolean;
  children:    React.ReactNode;
}> = ({ label, required, children }) => (
  <div>
    <label className="block text-sm text-text-sub mb-1.5">
      {label}{required && <span className="text-brand-red ml-1">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 px-4 text-white ' +
  'focus:border-brand-red focus:shadow-brand outline-none transition-all placeholder-text-sub/50';

const selectCls =
  'w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 px-4 text-white ' +
  'focus:border-brand-red outline-none transition-all appearance-none cursor-pointer';

// ── Main component ────────────────────────────────────────────────────────────

export const VehicleSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState<FormState>(INITIAL);
  const [error,     setError]     = useState<string | null>(null);
  const [submitting,setSubmitting]= useState(false);
  const [done,      setDone]      = useState(false);

  const update = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Per-step validation ────────────────────────────────────────────────────

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.make.trim())        return 'Vehicle make is required (e.g. Toyota).';
      if (!form.model.trim())       return 'Vehicle model is required (e.g. Prius).';
      if (!form.plateNumber.trim()) return 'Plate number is required.';
    }
    if (step === 2) {
      if (!form.insProvider.trim()) return 'Insurance provider is required.';
      if (!form.insPolicy.trim())   return 'Policy number is required.';
      if (!form.insExpiry)          return 'Insurance expiry date is required.';
    }
    if (step === 3) {
      if (!form.licNumber.trim())   return 'License number is required.';
      if (!form.licExpiry)          return 'License expiry date is required.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      await registerVehicle(user.uid, {
        vehicleType: form.vehicleType,
        make:        form.make.trim(),
        model:       form.model.trim(),
        year:        form.year,
        plateNumber: form.plateNumber.trim().toUpperCase(),
        color:       form.color,
        insurance: {
          provider:     form.insProvider.trim(),
          policyNumber: form.insPolicy.trim(),
          expiryDate:   form.insExpiry,
        },
        license: {
          licenseNumber: form.licNumber.trim(),
          expiryDate:    form.licExpiry,
        },
      });

      // Sync AuthContext — vehicleRegistered is now true in Firestore
      await refreshProfile();

      setDone(true);
      setTimeout(() => navigate('/booking'), 2000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Vehicle Registered!</h2>
          <p className="text-text-sub">Taking you to booking…</p>
        </motion.div>
      </div>
    );
  }

  // ── Step indicators ────────────────────────────────────────────────────────

  const StepBar = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const Icon      = s.icon;
        const isActive  = step === s.number;
        const isDone    = step > s.number;
        return (
          <React.Fragment key={s.number}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone  ? 'bg-brand-red border-brand-red' :
                isActive ? 'bg-brand-red/20 border-brand-red' :
                           'bg-white/5 border-white/20'
              }`}>
                {isDone
                  ? <CheckCircle className="w-5 h-5 text-white" />
                  : <Icon className={`w-5 h-5 ${isActive ? 'text-brand-red' : 'text-text-sub'}`} />
                }
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-text-sub'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 mx-2 transition-all ${step > s.number ? 'bg-brand-red' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm font-medium mb-4">
            <Car className="w-4 h-4" />
            Vehicle Registration
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Register Your Vehicle</h1>
          <p className="text-text-sub text-sm">
            Complete this once before booking your first ride.
            {user?.name && ` Welcome, ${user.name.split(' ')[0]}!`}
          </p>
        </div>

        <StepBar />

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 mb-5"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard glowColor="red">

              {/* ── Step 1: Vehicle Details ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Car className="w-5 h-5 text-brand-red" /> Vehicle Details
                  </h2>

                  {/* Vehicle type pills */}
                  <Field label="Vehicle Type" required>
                    <div className="grid grid-cols-4 gap-2">
                      {VEHICLE_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, vehicleType: t }))}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                            form.vehicleType === t
                              ? 'bg-brand-red/20 border-brand-red text-brand-red'
                              : 'bg-background-darker/50 border-white/10 text-text-sub hover:bg-white/5'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Make" required>
                      <input
                        type="text"
                        value={form.make}
                        onChange={update('make')}
                        placeholder="e.g. Toyota"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Model" required>
                      <input
                        type="text"
                        value={form.model}
                        onChange={update('model')}
                        placeholder="e.g. Prius"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Year">
                      <select value={form.year} onChange={update('year')} className={selectCls}>
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>
                    <Field label="Color">
                      <select value={form.color} onChange={update('color')} className={selectCls}>
                        {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Plate Number" required>
                    <input
                      type="text"
                      value={form.plateNumber}
                      onChange={update('plateNumber')}
                      placeholder="e.g. CAA-1234"
                      className={`${inputCls} uppercase`}
                    />
                  </Field>
                </div>
              )}

              {/* ── Step 2: Insurance ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-red" /> Insurance Details
                  </h2>

                  <Field label="Insurance Provider" required>
                    <input
                      type="text"
                      value={form.insProvider}
                      onChange={update('insProvider')}
                      placeholder="e.g. Ceylinco Insurance"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Policy Number" required>
                    <input
                      type="text"
                      value={form.insPolicy}
                      onChange={update('insPolicy')}
                      placeholder="e.g. INS-2024-001234"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Policy Expiry Date" required>
                    <input
                      type="date"
                      value={form.insExpiry}
                      onChange={update('insExpiry')}
                      min={new Date().toISOString().split('T')[0]}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                  </Field>

                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-xs text-blue-400">
                      Your insurance information is stored securely and only used to verify your vehicle eligibility.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 3: License ── */}
              {step === 3 && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-red" /> Driving License
                  </h2>

                  <Field label="License Number" required>
                    <input
                      type="text"
                      value={form.licNumber}
                      onChange={update('licNumber')}
                      placeholder="e.g. B1234567"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="License Expiry Date" required>
                    <input
                      type="date"
                      value={form.licExpiry}
                      onChange={update('licExpiry')}
                      min={new Date().toISOString().split('T')[0]}
                      className={`${inputCls} [color-scheme:dark]`}
                    />
                  </Field>

                  {/* Summary card */}
                  <div className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-text-sub uppercase tracking-wide mb-3">Review summary</p>
                    {[
                      ['Vehicle', `${form.year} ${form.make} ${form.model} (${form.vehicleType})`],
                      ['Plate',   form.plateNumber.toUpperCase()],
                      ['Color',   form.color],
                      ['Insurer', form.insProvider],
                      ['Policy',  form.insPolicy],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-text-sub">{label}</span>
                        <span className="text-white font-medium">{value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <NeonButton variant="secondary" onClick={handleBack} disabled={submitting}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </NeonButton>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <NeonButton variant="primary" onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </NeonButton>
          ) : (
            <NeonButton variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Complete Registration
                </span>
              )}
            </NeonButton>
          )}
        </div>
      </div>
    </div>
  );
};

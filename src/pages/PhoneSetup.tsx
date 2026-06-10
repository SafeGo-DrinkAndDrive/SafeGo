// ─── src/pages/PhoneSetup.tsx ─────────────────────────────────────────────────
// Shown after Google login when the user has no phone number.
// Collects phone + optional emergency contact before proceeding to VehicleSetup.
// Cannot be skipped — the user is blocked until phone is saved.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';
import { motion }           from 'framer-motion';
import { Phone, ShieldCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db }           from '../firebase';
import { GlassCard }    from '../components/GlassCard';
import { NeonButton }   from '../components/NeonButton';
import { useAuth }      from '../contexts/AuthContext';

// ── Validation ────────────────────────────────────────────────────────────────

function isValidSriLankaPhone(phone: string): boolean {
  // Accepts: 07XXXXXXXX, +947XXXXXXXX, 947XXXXXXXX (10–12 digits)
  return /^(?:\+94|94|0)?[1-9]\d{8}$/.test(phone.replace(/\s|-/g, ''));
}

function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length === 11) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 10)  return '+94' + digits.slice(1);
  return phone.trim();
}

async function isPhoneTaken(phone: string, currentUid: string): Promise<boolean> {
  const q    = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  // Ignore a match that is the current user themselves
  return snap.docs.some((d) => d.id !== currentUid);
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PhoneSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [phone,     setPhone]     = useState('');
  const [emergency, setEmergency] = useState('');
  const [address,   setAddress]   = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normPhone = normalisePhone(phone);

    if (!isValidSriLankaPhone(normPhone)) {
      setError('Please enter a valid Sri Lankan mobile number (e.g. 0771234567).');
      return;
    }

    setSaving(true);

    try {
      // Prevent duplicate phone numbers across accounts
      const taken = await isPhoneTaken(normPhone, user.uid);
      if (taken) {
        setError('This phone number is already associated with another account.');
        return;
      }

      const updates: Record<string, string> = { phone: normPhone };
      if (address.trim())   updates.address           = address.trim();
      if (emergency.trim()) updates.emergencyContact  = normalisePhone(emergency);

      await updateDoc(doc(db, 'users', user.uid), updates);
      await refreshProfile();

      setDone(true);
      setTimeout(() => navigate('/vehicle-setup'), 1500);
    } catch (err: any) {
      setError(err.message ?? 'Could not save your phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Contact details saved!</h2>
          <p className="text-text-sub">Taking you to vehicle setup…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm font-medium mb-4">
            <Phone className="w-4 h-4" />
            One more step
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Add Your Phone Number
          </h1>
          <p className="text-text-sub text-sm">
            Hi {user.name?.split(' ')[0] ?? 'there'}! We need your mobile number so drivers can
            contact you and we can send booking confirmations via WhatsApp.
          </p>
        </div>

        <GlassCard glowColor="red">
          {/* Why we need this */}
          <div className="flex items-start gap-3 p-4 mb-6 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              Your phone number is only shared with your assigned driver for your active booking.
              It is never sold or used for marketing.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone number — required */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Mobile Number <span className="text-brand-red">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  required
                  autoComplete="tel"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
              <p className="text-xs text-text-sub mt-1">Sri Lankan mobile number required</p>
            </div>

            {/* Emergency contact — optional */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Emergency Contact <span className="text-text-sub/50">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="tel"
                  value={emergency}
                  onChange={(e) => setEmergency(e.target.value)}
                  placeholder="e.g. 0717654321"
                  autoComplete="tel"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
              <p className="text-xs text-text-sub mt-1">
                Who should we call in an emergency?
              </p>
            </div>

            {/* Address — optional */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Home Address <span className="text-text-sub/50">(optional)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 42 Galle Road, Colombo 3"
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-red outline-none transition-all"
              />
              <p className="text-xs text-text-sub mt-1">Useful for frequent home drop-offs</p>
            </div>

            <NeonButton
              variant="primary"
              fullWidth
              type="submit"
              disabled={saving}
              className="mt-2"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </span>
              ) : (
                'Save & Continue'
              )}
            </NeonButton>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

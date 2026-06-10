// ─── src/pages/Register.tsx ───────────────────────────────────────────────────
// Changes (Phase 2):
//   Google register path → redirects to /phone-setup if phone is empty.
//   Email/password path → phone is collected in the form, so go straight to
//   /vehicle-setup as before.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Link, useNavigate }  from 'react-router-dom';
import { motion }             from 'framer-motion';
import { User, Mail, Phone, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { GlassCard }          from '../components/GlassCard';
import { NeonButton }         from '../components/NeonButton';
import { useAuth }            from '../contexts/AuthContext';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

interface FormState {
  name:     string;
  email:    string;
  phone:    string;
  password: string;
  confirm:  string;
}

function validate(form: FormState): string | null {
  if (!form.name.trim())                    return 'Full name is required.';
  if (!form.email.trim())                   return 'Email is required.';
  if (!form.phone.trim())                   return 'Phone number is required.';
  if (!/^(?:\+94|0)?[1-9]\d{8}$/.test(form.phone.replace(/\s|-/g, '')))
    return 'Enter a valid Sri Lankan mobile number.';
  if (form.password.length < 6)             return 'Password must be at least 6 characters.';
  if (form.password !== form.confirm)       return 'Passwords do not match.';
  return null;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, authError, clearError } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', password: '', confirm: '',
  });
  const [localErr,  setLocalErr]  = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogle,  setIsGoogle]  = useState(false);
  const [success,   setSuccess]   = useState(false);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setLocalErr(err); return; }

    setIsLoading(true);
    setLocalErr(null);
    clearError();

    try {
      await register(form.name.trim(), form.email.trim(), form.phone.trim(), form.password);
      setSuccess(true);
      setTimeout(() => navigate('/vehicle-setup'), 1500);
    } catch (err: any) {
      setLocalErr(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogle(true);
    setLocalErr(null);
    clearError();
    try {
      const result = await loginWithGoogle();
      // loginWithGoogle returns the user profile so we can check phone inline.
      // AuthContext also updates user state — the redirect below reads from there.
      // If phone is missing (Google account has no phone), go collect it.
      // If phone exists (returning user), go to vehicle-setup or booking.
      navigate(result?.phone?.trim() ? '/vehicle-setup' : '/phone-setup');
    } catch (err: any) {
      setLocalErr(err.message);
    } finally {
      setIsGoogle(false);
    }
  };

  const displayError = localErr ?? authError;

  if (success) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Account Created!</h2>
          <p className="text-text-sub">Taking you to vehicle setup…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-text-sub">Join SafeGo for safe, reliable rides</p>
        </div>

        <GlassCard glowColor="red">
          {displayError && (
            <div className="mb-5 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {displayError}
            </div>
          )}

          {/* Google sign-up */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isGoogle || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-5 rounded-xl border border-white/15 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <GoogleIcon />
            {isGoogle ? 'Signing up…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-text-sub">or register with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Kamal Perera"
                  required
                  autoComplete="name"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="0771234567"
                  required
                  autoComplete="tel"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 6 characters"
                  required
                  autoComplete="new-password"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs text-text-sub uppercase tracking-wide mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
                <input
                  type="password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Repeat password"
                  required
                  autoComplete="new-password"
                  className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            <NeonButton
              variant="primary"
              fullWidth
              type="submit"
              disabled={isLoading}
              className="mt-2"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </NeonButton>
          </form>

          <p className="text-center text-sm text-text-sub mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-red hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
};

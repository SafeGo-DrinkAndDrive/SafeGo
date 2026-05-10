// ─── src/pages/Register.tsx ───────────────────────────────────────────────────
// Simplified registration: name, email, phone, password.
// Complex vehicle/insurance data is removed for MVP (can be added in profile).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { GlassCard }  from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import { useAuth }    from '../contexts/AuthContext';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
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

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, authError, clearError } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', password: '', confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogle,  setIsGoogle]  = useState(false);
  const [localErr,  setLocalErr]  = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim())                      return 'Full name is required.';
    if (!form.email.trim())                     return 'Email is required.';
    if (!form.phone.trim())                     return 'Phone number is required.';
    if (form.password.length < 6)               return 'Password must be at least 6 characters.';
    if (form.password !== form.confirm)         return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
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
      await loginWithGoogle();
      navigate('/vehicle-setup');
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
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Account Created!</h2>
          <p className="text-text-sub mt-2">Redirecting you to booking…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isGoogle || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-5 rounded-xl border border-white/15 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <GoogleIcon />
            {isGoogle ? 'Redirecting...' : 'Sign up with Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-text-sub">or sign up with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="relative">
              <User className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input type="text" value={form.name} onChange={update('name')} placeholder="Full Name" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all" />
            </div>
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input type="email" value={form.email} onChange={update('email')} placeholder="Email Address" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all" />
            </div>
            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input type="tel" value={form.phone} onChange={update('phone')} placeholder="Phone Number (e.g. 0771234567)" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all" />
            </div>
            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input type="password" value={form.password} onChange={update('password')} placeholder="Password (min 6 chars)" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all" />
            </div>
            {/* Confirm */}
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input type="password" value={form.confirm} onChange={update('confirm')} placeholder="Confirm Password" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all" />
            </div>

            <NeonButton variant="primary" fullWidth type="submit" disabled={isLoading || isGoogle}>
              {isLoading ? 'Creating Account…' : 'Create Account'}
            </NeonButton>
          </form>

          <p className="mt-6 text-center text-sm text-text-sub">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-red hover:text-white transition-colors font-medium">
              Login here
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
};

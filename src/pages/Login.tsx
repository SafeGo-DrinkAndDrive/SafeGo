// ─── src/pages/Login.tsx ──────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
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

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, vehicleRegistered, login, loginWithGoogle, authError, clearError } = useAuth();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogle,  setIsGoogle]  = useState(false);
  const [localErr,  setLocalErr]  = useState<string | null>(null);
  // Flag: set true once login action completes so the effect knows to redirect
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const intendedFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // ── Redirect AFTER user state has settled in context ─────────────────────
  // This avoids the race condition of reading vehicleRegistered before
  // AuthContext has finished setting the user from Firestore.
  useEffect(() => {
    if (!shouldRedirect || !isAuthenticated) return;

    if (!vehicleRegistered) {
      navigate('/vehicle-setup', { replace: true });
    } else if (intendedFrom && intendedFrom !== '/login') {
      navigate(intendedFrom, { replace: true });
    } else {
      navigate('/booking', { replace: true });
    }
  }, [shouldRedirect, isAuthenticated, vehicleRegistered, navigate, intendedFrom]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalErr(null);
    clearError();
    try {
      await login(email, password);
      setShouldRedirect(true); // trigger useEffect above
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
      setShouldRedirect(true);
    } catch (err: any) {
      setLocalErr(err.message);
    } finally {
      setIsGoogle(false);
    }
  };

  const displayError = localErr ?? authError;

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-text-sub">Login to book your next safe ride</p>
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
            {isGoogle ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-text-sub">or continue with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-text-sub" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required
                className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none transition-all"
              />
            </div>

            <NeonButton variant="primary" fullWidth type="submit" disabled={isLoading || isGoogle}>
              {isLoading ? 'Logging in…' : <><span>Login</span><LogIn className="w-5 h-5 ml-2" /></>}
            </NeonButton>
          </form>

          <p className="mt-6 text-center text-sm text-text-sub">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-red hover:text-white transition-colors font-medium">
              Register here
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
};

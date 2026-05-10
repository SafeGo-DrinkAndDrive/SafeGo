// ─── src/components/Navbar.tsx ────────────────────────────────────────────────
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, Shield, Car, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, vehicleRegistered, logout } = useAuth();
  const location    = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLink = (to: string, label: string, icon?: React.ReactNode) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
        isActive(to) ? 'text-brand-red' : 'text-text-sub hover:text-white'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo.jpg" alt="SafeGo" className="h-12 w-auto rounded-lg object-contain" />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {navLink('/', 'Home')}

            {/* Vehicle setup nudge — shown only when logged in but not yet registered */}
            {isAuthenticated && !vehicleRegistered && (
              <Link
                to="/vehicle-setup"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive('/vehicle-setup') ? 'text-yellow-300' : 'text-yellow-400 hover:text-yellow-300'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                Complete Setup
              </Link>
            )}

            {isAuthenticated && vehicleRegistered && (
              <>
                {navLink('/booking',    'Book a Ride',  <Car className="w-3.5 h-3.5" />)}
                {navLink('/my-bookings','My Bookings',  <ClipboardList className="w-3.5 h-3.5" />)}
              </>
            )}

            {isAdmin && navLink('/admin', 'Dashboard', <Shield className="w-3.5 h-3.5" />)}

            <div className="h-6 w-px bg-white/10" />

            {/* User area */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red text-sm font-bold">
                      {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <span className="text-sm text-text-sub">{user?.name}</span>
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-brand-red/10 text-brand-red border border-brand-red/30 rounded-full">
                      <Shield className="w-3 h-3" /> admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-text-sub hover:text-brand-red transition-colors rounded-lg hover:bg-brand-red/5"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-medium text-text-sub hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 text-sm font-medium bg-brand-red/10 text-brand-red border border-brand-red/50 rounded-full hover:bg-brand-red/20 transition-all"
                  >
                    Register
                  </motion.button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-text-sub hover:text-white"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-background/95 backdrop-blur-lg"
          >
            <div className="px-4 py-5 space-y-4">
              {navLink('/', 'Home')}

              {isAuthenticated && !vehicleRegistered && (
                <Link to="/vehicle-setup" onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 text-sm font-medium text-yellow-400">
                  <Car className="w-3.5 h-3.5" /> Complete Setup
                </Link>
              )}

              {isAuthenticated && vehicleRegistered && (
                <>
                  {navLink('/booking',     'Book a Ride',  <Car className="w-3.5 h-3.5" />)}
                  {navLink('/my-bookings', 'My Bookings',  <ClipboardList className="w-3.5 h-3.5" />)}
                </>
              )}

              {isAdmin && navLink('/admin', 'Dashboard', <Shield className="w-3.5 h-3.5" />)}

              <div className="pt-3 border-t border-white/10">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-sub">{user?.name}</span>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 text-sm text-text-sub hover:text-brand-red transition-colors">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <Link to="/login" onClick={() => setOpen(false)} className="text-sm text-text-sub hover:text-white">Login</Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="text-sm text-brand-red font-medium">Register</Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

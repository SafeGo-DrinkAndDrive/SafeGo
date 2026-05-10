// ─── src/pages/Home.tsx ───────────────────────────────────────────────────────
// Hero "Book Now" redirects to /booking.
// Quick-book form on the hero is a visual teaser only —
// authenticated + vehicle-registered users go straight to the full booking page.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion }      from 'framer-motion';
import { MapPin, Navigation, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { GlassCard }        from '../components/GlassCard';
import { NeonButton }       from '../components/NeonButton';
import { HowItWorks }       from '../components/HowItWorks';
import { ServicesPackages } from '../components/ServicesPackages';
import { LiveFareShowcase } from '../components/LiveFareShowcase';
import { WhyChoose }        from '../components/WhyChoose';
import { Testimonials }     from '../components/Testimonials';
import { Footer }           from '../components/Footer';
import { useAuth }          from '../contexts/AuthContext';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, vehicleRegistered } = useAuth();

  // Where "Book Now" should go based on auth + vehicle state
  const handleBookNow = () => {
    if (!isAuthenticated)    { navigate('/register');      return; }
    if (!vehicleRegistered)  { navigate('/vehicle-setup'); return; }
    navigate('/booking');
  };

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="min-h-[calc(100vh-80px)] flex items-center relative py-12 lg:py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy + CTA card */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm font-medium"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Premium Chauffeur Service</span>
                </motion.div>

                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  Your Ride Home. <br />
                  <span className="text-brand-red text-glow-red">Safe Every Time.</span>
                </h1>
                <p className="text-lg text-text-sub max-w-lg">
                  Professional drivers for your vehicle. Whether it's a night out or a full day
                  trip, we ensure you and your car get home safely.
                </p>
              </div>

              {/* Quick-book card */}
              <GlassCard glowColor="red" className="max-w-md">
                <div className="space-y-4">

                  {/* Personalised greeting for logged-in users */}
                  {isAuthenticated && user && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 text-sm text-brand-red font-medium pb-1"
                    >
                      <Zap className="w-4 h-4" />
                      <span>
                        {vehicleRegistered
                          ? `Welcome back, ${user.name.split(' ')[0]}! Ready to book?`
                          : `Hi ${user.name.split(' ')[0]}! Complete your vehicle setup first.`}
                      </span>
                    </motion.div>
                  )}

                  {/* Location preview inputs (decorative — clicking CTA navigates to full form) */}
                  <div
                    onClick={handleBookNow}
                    className="relative cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleBookNow()}
                  >
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-brand-red" />
                    </div>
                    <input
                      readOnly
                      placeholder="Enter pickup location"
                      className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-text-sub cursor-pointer group-hover:border-brand-red/50 transition-all outline-none"
                    />
                  </div>

                  <div
                    onClick={handleBookNow}
                    className="relative cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleBookNow()}
                  >
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Navigation className="h-5 w-5 text-brand-gray" />
                    </div>
                    <input
                      readOnly
                      placeholder="Enter destination"
                      className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-text-sub cursor-pointer group-hover:border-white/20 transition-all outline-none"
                    />
                  </div>

                  {/* Main CTA */}
                  <div className="pt-2">
                    <NeonButton fullWidth onClick={handleBookNow}>
                      {isAuthenticated && vehicleRegistered
                        ? <><span>Book Now — Instant</span><ArrowRight className="w-5 h-5 ml-2" /></>
                        : isAuthenticated
                          ? <><span>Complete Setup to Book</span><ArrowRight className="w-5 h-5 ml-2" /></>
                          : <><span>Register to Continue</span><ArrowRight className="w-5 h-5 ml-2" /></>
                      }
                    </NeonButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Right: hero visual */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative flex items-center justify-center"
            >
              <div className="absolute w-[80%] h-[80%] bg-brand-red/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10 w-full max-w-md">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                >
                  <div className="relative rounded-3xl overflow-hidden shadow-subtle border border-white/10">
                    <img
                      src="https://images.pexels.com/photos/12561766/pexels-photo-12561766.jpeg"
                      alt="Professional chauffeur service at night"
                      className="w-full h-[420px] sm:h-[480px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Drivers Available Now
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[['500+', 'Safe Rides', false], ['4.9', 'Rating', true], ['24/7', 'Available', false]].map(
                          ([val, label, red]) => (
                            <div key={label as string} className="bg-black/50 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                              <p className={`text-xl font-bold ${red ? 'text-brand-red' : 'text-white'}`}>{val}</p>
                              <p className="text-[10px] text-text-sub mt-0.5">{label}</p>
                            </div>
                          )
                        )}
                      </div>

                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                        className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-brand-red/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-brand-red">AK</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">Amal Kumara</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <p className="text-xs text-text-sub">Professional Driver • 5 min away</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Content sections */}
      <HowItWorks />
      <ServicesPackages />
      <LiveFareShowcase />
      <WhyChoose />
      <Testimonials />

      {/* Final CTA */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard glowColor="red" className="text-center py-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-red/10 to-brand-gray/10" />
              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold">
                  Ready to Ride{' '}
                  <span className="text-brand-red text-glow-red">Safe?</span>
                </h2>
                <p className="text-lg text-text-sub">
                  Join thousands of satisfied customers who trust SafeGo for their journey home
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <NeonButton variant="primary" onClick={handleBookNow}>
                    Get Started <ArrowRight className="w-5 h-5 ml-2" />
                  </NeonButton>
                  {!isAuthenticated && (
                    <NeonButton variant="outline" onClick={() => navigate('/login')}>
                      Sign In
                    </NeonButton>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

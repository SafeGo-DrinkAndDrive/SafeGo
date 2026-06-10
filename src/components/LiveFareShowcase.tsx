// ─── src/components/LiveFareShowcase.tsx ─────────────────────────────────────
// Fix: removed import from '../utils/fareCalculator' (deleted in Phase 3).
// formatCurrency is now inlined.
// Mock journey fares are hardcoded display values — not from the pricing engine.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, TrendingUp } from "lucide-react";
import { GlassCard } from "./GlassCard";

// Inline — fareCalculator.ts has been removed
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const mockJourneys = [
  {
    from: "Colombo Fort",
    to: "Mount Lavinia",
    distance: 12,
    fare: 2000,
    time: 25,
  },
  { from: "Kandy City", to: "Peradeniya", distance: 8, fare: 1800, time: 18 },
  { from: "Galle Face", to: "Negombo", distance: 35, fare: 4300, time: 55 },
];

export const LiveFareShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockJourneys.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const current = mockJourneys[currentIndex];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-brand-red/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Live{" "}
            <span className="text-brand-red text-glow-red">Fare Preview</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            See real-time fare estimates across popular routes
          </p>
        </motion.div>

        <div className="max-w-md mx-auto">
          <GlassCard glowColor="red">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* Route */}
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
                    <div className="w-0.5 h-8 bg-white/10" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs text-text-sub mb-0.5">From</p>
                      <p className="text-white font-medium">{current.from}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-sub mb-0.5">To</p>
                      <p className="text-white font-medium">{current.to}</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                    <MapPin className="w-4 h-4 text-brand-red mx-auto mb-1" />
                    <p className="text-xs text-text-sub mb-1">Distance</p>
                    <p className="text-lg font-bold text-white">
                      {current.distance}
                      <span className="text-xs text-text-sub ml-0.5">km</span>
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                    <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-xs text-text-sub mb-1">Time</p>
                    <p className="text-lg font-bold text-white">
                      {current.time}
                      <span className="text-xs text-text-sub ml-0.5">min</span>
                    </p>
                  </div>
                  <div className="bg-brand-red/10 rounded-xl p-3 text-center border border-brand-red/20">
                    <TrendingUp className="w-4 h-4 text-brand-red mx-auto mb-1" />
                    <p className="text-xs text-text-sub mb-1">Fare</p>
                    <p className="text-sm font-bold text-brand-red">
                      {formatCurrency(current.fare)}
                    </p>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2">
                  {mockJourneys.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentIndex
                          ? "w-8 bg-brand-red"
                          : "w-2 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};

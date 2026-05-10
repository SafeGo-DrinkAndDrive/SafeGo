import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { formatCurrency } from '../utils/fareCalculator';
const mockJourneys = [
{
  from: 'Colombo Fort',
  to: 'Mount Lavinia',
  distance: 12,
  fare: 2000,
  time: 25
},
{
  from: 'Kandy City',
  to: 'Peradeniya',
  distance: 8,
  fare: 1800,
  time: 18
},
{
  from: 'Galle Face',
  to: 'Negombo',
  distance: 35,
  fare: 4300,
  time: 55
}];

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
      {/* Background glow effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] bg-brand-red/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          whileInView={{
            opacity: 1,
            y: 0
          }}
          viewport={{
            once: true
          }}
          transition={{
            duration: 0.6
          }}
          className="text-center mb-12">
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Live{' '}
            <span className="text-brand-red text-glow-red">Fare Preview</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            See real-time fare estimates for popular routes
          </p>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95
          }}
          whileInView={{
            opacity: 1,
            scale: 1
          }}
          viewport={{
            once: true
          }}
          transition={{
            duration: 0.6,
            delay: 0.2
          }}
          className="max-w-2xl mx-auto">
          
          <GlassCard glowColor="red" className="relative border-brand-red/30">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{
                  opacity: 0,
                  x: 50
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                exit={{
                  opacity: 0,
                  x: -50
                }}
                transition={{
                  duration: 0.5
                }}
                className="space-y-5">
                
                {/* Route */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-red flex-shrink-0" />
                      <p className="text-xs text-text-sub">From</p>
                    </div>
                    <p className="text-lg sm:text-xl font-semibold truncate">
                      {current.from}
                    </p>
                  </div>

                  <motion.div
                    animate={{
                      x: [0, 6, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2
                    }}
                    className="flex-shrink-0 px-1">
                    
                    <TrendingUp className="w-5 h-5 text-brand-red rotate-90" />
                  </motion.div>

                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <p className="text-xs text-text-sub">To</p>
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-gray flex-shrink-0" />
                    </div>
                    <p className="text-lg sm:text-xl font-semibold truncate">
                      {current.to}
                    </p>
                  </div>
                </div>

                {/* Stats — stacks on very small screens */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-background-darker/50 rounded-xl p-3 sm:p-4 border border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-red" />
                      <p className="text-[10px] sm:text-xs text-text-sub">
                        Distance
                      </p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white leading-tight">
                      {current.distance}
                      <span className="text-xs sm:text-sm text-text-sub ml-0.5">
                        km
                      </span>
                    </p>
                  </div>

                  <div className="bg-background-darker/50 rounded-xl p-3 sm:p-4 border border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-gray" />
                      <p className="text-[10px] sm:text-xs text-text-sub">
                        Est. Time
                      </p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white leading-tight">
                      {current.time}
                      <span className="text-xs sm:text-sm text-text-sub ml-0.5">
                        min
                      </span>
                    </p>
                  </div>

                  <div className="bg-brand-red/10 rounded-xl p-3 sm:p-4 border border-brand-red/20 text-center">
                    <p className="text-[10px] sm:text-xs text-text-sub mb-1.5">
                      Fare
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-brand-red leading-tight break-all">
                      {formatCurrency(current.fare)}
                    </p>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 pt-1">
                  {mockJourneys.map((_, idx) =>
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-brand-red' : 'w-2 bg-white/20'}`} />

                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        </motion.div>
      </div>
    </section>);

};
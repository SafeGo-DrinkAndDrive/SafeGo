import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { GlassCard } from './GlassCard';
const testimonials = [
{
  name: 'Priya Jayawardena',
  role: 'Business Executive',
  review:
  'SafeGo has been a lifesaver for my late-night work events. Professional drivers and always on time!',
  rating: 5
},
{
  name: 'Rohan Silva',
  role: 'Event Organizer',
  review:
  'Used SafeGo for our corporate event. The full-day package was perfect and very affordable.',
  rating: 5
},
{
  name: 'Amara Fernando',
  role: 'Frequent Traveler',
  review:
  'The transparent pricing and real-time tracking give me complete peace of mind. Highly recommend!',
  rating: 5
}];

export const Testimonials: React.FC = () => {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          className="text-center mb-16">
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            What Our{' '}
            <span className="text-brand-red text-glow-red">Customers Say</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            Join thousands of satisfied riders who trust SafeGo
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) =>
          <motion.div
            key={index}
            initial={{
              opacity: 0,
              y: 30
            }}
            whileInView={{
              opacity: 1,
              y: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              duration: 0.5,
              delay: index * 0.15
            }}
            whileHover={{
              y: -5
            }}>
            
              <GlassCard className="h-full relative overflow-hidden border-brand-red/20 hover:border-brand-red/50 transition-all duration-300">
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="w-16 h-16 text-brand-red" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Rating */}
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) =>
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                      scale: 0
                    }}
                    whileInView={{
                      opacity: 1,
                      scale: 1
                    }}
                    viewport={{
                      once: true
                    }}
                    transition={{
                      delay: 0.5 + i * 0.1
                    }}>
                    
                        <Star className="w-5 h-5 fill-brand-red text-brand-red" />
                      </motion.div>
                  )}
                  </div>

                  {/* Review */}
                  <p className="text-text-sub italic leading-relaxed">
                    "{testimonial.review}"
                  </p>

                  {/* User info */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="font-semibold text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-text-sub">{testimonial.role}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </section>);

};
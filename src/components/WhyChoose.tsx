import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, CheckCircle, DollarSign } from 'lucide-react';
import { GlassCard } from './GlassCard';
const features = [
{
  icon: Shield,
  title: 'Professional Drivers',
  description: 'Vetted, trained, and experienced chauffeurs you can trust',
  color: 'red' as const
},
{
  icon: CheckCircle,
  title: 'Safe & Reliable',
  description: '24/7 support with real-time tracking for your peace of mind',
  color: 'gray' as const
},
{
  icon: Zap,
  title: 'Fast Booking',
  description: 'Book in seconds with our streamlined mobile-first platform',
  color: 'red-light' as const
},
{
  icon: DollarSign,
  title: 'Transparent Pricing',
  description: 'No hidden fees. Know your fare upfront before you book',
  color: 'red' as const
}];

export const WhyChoose: React.FC = () => {
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
            Why Choose{' '}
            <span className="text-brand-red text-glow-red">SafeGo</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            Experience the difference with our premium chauffeur service
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
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
                  delay: index * 0.1
                }}>
                
                <GlassCard className="h-full group hover:border-brand-red/50 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 5
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300
                      }}
                      className={`flex-shrink-0 p-3 rounded-xl ${feature.color === 'red' ? 'bg-brand-red/10 border border-brand-red/20' : feature.color === 'gray' ? 'bg-brand-gray/10 border border-brand-gray/20' : 'bg-brand-red-light/10 border border-brand-red-light/20'}`}>
                      
                      <Icon
                        className={`w-6 h-6 ${feature.color === 'red' ? 'text-brand-red' : feature.color === 'gray' ? 'text-brand-gray' : 'text-brand-red-light'}`} />
                      
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold group-hover:text-brand-red transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-text-sub">{feature.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>);

          })}
        </div>
      </div>
    </section>);

};
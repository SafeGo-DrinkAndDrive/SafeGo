import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, MapPin, Car } from 'lucide-react';
import { GlassCard } from './GlassCard';
const steps = [
{
  icon: UserPlus,
  title: 'Register as Passenger',
  description:
  'Create your account in seconds and join our trusted community',
  color: 'red' as const
},
{
  icon: MapPin,
  title: 'Enter Pickup Location',
  description: 'Tell us where you are and where you need to go',
  color: 'gray' as const
},
{
  icon: Car,
  title: 'Get Driver & Ride Safely',
  description: 'Professional driver arrives to take you home safely',
  color: 'red-light' as const
}];

export const HowItWorks: React.FC = () => {
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
            How It <span className="text-brand-red text-glow-red">Works</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            Getting a safe ride home is as easy as 1-2-3
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
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
                  delay: index * 0.2
                }}>
                
                <GlassCard glowColor={step.color} className="h-full">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 5
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300
                      }}
                      className={`p-4 rounded-2xl ${step.color === 'red' ? 'bg-brand-red/10 border border-brand-red/20' : step.color === 'gray' ? 'bg-brand-gray/10 border border-brand-gray/20' : 'bg-brand-red-light/10 border border-brand-red-light/20'}`}>
                      
                      <Icon
                        className={`w-10 h-10 ${step.color === 'red' ? 'text-brand-red' : step.color === 'gray' ? 'text-brand-gray' : 'text-brand-red-light'}`} />
                      
                    </motion.div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`text-2xl font-bold ${step.color === 'red' ? 'text-brand-red' : step.color === 'gray' ? 'text-brand-gray' : 'text-brand-red-light'}`}>
                          
                          {index + 1}
                        </span>
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-text-sub">{step.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>);

          })}
        </div>
      </div>
    </section>);

};
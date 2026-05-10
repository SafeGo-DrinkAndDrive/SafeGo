import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Calendar, ArrowRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { NeonButton } from './NeonButton';
import { useNavigate } from 'react-router-dom';
const packages = [
{
  icon: MapPin,
  title: 'Distance Package',
  description: 'Perfect for point-to-point trips across the city',
  price: 'LKR 1,800',
  details: 'Base 10km + LKR 100/km',
  color: 'red' as const
},
{
  icon: Clock,
  title: 'Hourly Package',
  description: 'Flexible hourly rates for multiple stops',
  price: 'From LKR 2,500',
  details: 'Starting at 1 hour',
  color: 'gray' as const
},
{
  icon: Calendar,
  title: 'Full Day Package',
  description: 'All-day service for events and long trips',
  price: 'From LKR 2,500',
  details: 'Starting at 4 hours',
  color: 'red-light' as const
}];

export const ServicesPackages: React.FC = () => {
  const navigate = useNavigate();
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
            Our <span className="text-brand-red text-glow-red">Packages</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            Choose the package that fits your journey
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
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
                  delay: index * 0.15
                }}
                whileHover={{
                  y: -8
                }}>
                
                <GlassCard
                  glowColor={pkg.color}
                  className="h-full flex flex-col group hover:shadow-subtle transition-shadow duration-300">
                  
                  <div className="flex-grow space-y-6">
                    <motion.div
                      whileHover={{
                        scale: 1.1,
                        rotate: 360
                      }}
                      transition={{
                        duration: 0.6
                      }}
                      className={`inline-flex p-4 rounded-2xl ${pkg.color === 'red' ? 'bg-brand-red/10 border border-brand-red/20' : pkg.color === 'gray' ? 'bg-brand-gray/10 border border-brand-gray/20' : 'bg-brand-red-light/10 border border-brand-red-light/20'}`}>
                      
                      <Icon
                        className={`w-8 h-8 ${pkg.color === 'red' ? 'text-brand-red' : pkg.color === 'gray' ? 'text-brand-gray' : 'text-brand-red-light'}`} />
                      
                    </motion.div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold">{pkg.title}</h3>
                      <p className="text-text-sub">{pkg.description}</p>
                    </div>

                    <div className="space-y-2">
                      <p
                        className={`text-3xl font-bold ${pkg.color === 'red' ? 'text-brand-red' : pkg.color === 'gray' ? 'text-brand-gray' : 'text-brand-red-light'}`}>
                        
                        {pkg.price}
                      </p>
                      <p className="text-sm text-text-sub">{pkg.details}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <NeonButton
                      fullWidth
                      variant={
                      pkg.color === 'red' ?
                      'primary' :
                      pkg.color === 'gray' ?
                      'secondary' :
                      'primary'
                      }
                      onClick={() => navigate('/register')}>
                      
                      Book Now <ArrowRight className="w-4 h-4 ml-2" />
                    </NeonButton>
                  </div>
                </GlassCard>
              </motion.div>);

          })}
        </div>
      </div>
    </section>);

};
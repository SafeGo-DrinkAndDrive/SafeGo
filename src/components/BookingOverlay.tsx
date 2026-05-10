import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, MessageCircle } from 'lucide-react';
type BookingStep = 'processing' | 'whatsapp' | 'done' | null;
interface BookingOverlayProps {
  step: BookingStep;
  onClose: () => void;
}
export const BookingOverlay: React.FC<BookingOverlayProps> = ({
  step,
  onClose
}) => {
  return (
    <AnimatePresence>
      {step &&
      <motion.div
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        exit={{
          opacity: 0
        }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={step === 'done' ? onClose : undefined}>
        
          <motion.div
          initial={{
            scale: 0.9,
            opacity: 0
          }}
          animate={{
            scale: 1,
            opacity: 1
          }}
          exit={{
            scale: 0.9,
            opacity: 0
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
          className="bg-background-card backdrop-blur-md border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-subtle"
          onClick={(e) => e.stopPropagation()}>
          
            {step === 'processing' &&
          <div className="space-y-4">
                <motion.div
              animate={{
                rotate: 360
              }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: 'linear'
              }}
              className="inline-block">
              
                  <Loader2 className="w-12 h-12 text-brand-red mx-auto" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">
                  Processing Booking…
                </h3>
                <p className="text-text-sub text-sm">
                  Saving your ride details
                </p>
              </div>
          }

            {step === 'whatsapp' &&
          <div className="space-y-4">
                <motion.div
              initial={{
                scale: 0
              }}
              animate={{
                scale: 1
              }}
              transition={{
                type: 'spring',
                stiffness: 300
              }}>
              
                  <MessageCircle className="w-12 h-12 text-green-500 mx-auto" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">
                  Opening WhatsApp…
                </h3>
                <p className="text-text-sub text-sm">
                  Confirm your booking with our team
                </p>
              </div>
          }

            {step === 'done' &&
          <div className="space-y-4">
                <motion.div
              initial={{
                scale: 0
              }}
              animate={{
                scale: 1
              }}
              transition={{
                type: 'spring',
                stiffness: 300
              }}>
              
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                </motion.div>
                <h3 className="text-xl font-bold text-white">Booking Sent!</h3>
                <p className="text-text-sub text-sm">
                  Our team will confirm your ride shortly
                </p>
                <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-brand-red text-white rounded-full text-sm font-medium hover:bg-brand-red-dark transition-colors">
              
                  Done
                </button>
              </div>
          }
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

};
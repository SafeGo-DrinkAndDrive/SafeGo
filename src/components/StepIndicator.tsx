import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  labels
}) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-white/10 z-0 rounded-full" />

        {/* Active Line */}
        <motion.div
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-brand-red shadow-brand z-0 rounded-full"
          initial={{
            width: '0%'
          }}
          animate={{
            width: `${(currentStep - 1) / (totalSteps - 1) * 100}%`
          }}
          transition={{
            duration: 0.5,
            ease: 'easeInOut'
          }} />
        

        {/* Steps */}
        {Array.from({
          length: totalSteps
        }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          return (
            <div
              key={stepNumber}
              className="relative z-10 flex flex-col items-center">
              
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                  isActive || isCompleted ? '#E53935' : '#111111',
                  borderColor:
                  isActive || isCompleted ?
                  '#E53935' :
                  'rgba(255,255,255,0.2)',
                  scale: isActive ? 1.2 : 1
                }}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${isActive || isCompleted ? 'shadow-brand text-white' : 'text-text-sub'}`}>
                
                {isCompleted ?
                <Check className="w-4 h-4 text-white" /> :

                <span className="text-xs font-bold">{stepNumber}</span>
                }
              </motion.div>

              {/* Label - Hidden on very small screens, visible on md+ */}
              <div className="absolute top-10 w-24 text-center hidden md:block">
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${isActive ? 'text-brand-red text-glow-red' : isCompleted ? 'text-white' : 'text-text-sub'}`}>
                  
                  {labels[index]}
                </span>
              </div>
            </div>);

        })}
      </div>
    </div>);

};
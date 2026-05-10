import React from 'react';
import { motion } from 'framer-motion';
interface NeonButtonProps extends
  React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  children: React.ReactNode;
}
export const NeonButton: React.FC<NeonButtonProps> = ({
  variant = 'primary',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses =
  'relative font-semibold rounded-full px-8 py-3 transition-all duration-300 overflow-hidden group';
  const widthClass = fullWidth ? 'w-full' : '';
  const variants = {
    primary:
    'bg-brand-red text-white shadow-brand hover:bg-brand-red-dark border border-brand-red/50',
    secondary:
    'bg-brand-red-dark text-white shadow-subtle hover:bg-brand-red border border-brand-red-dark/50',
    outline:
    'bg-transparent border-2 border-brand-red text-brand-red hover:bg-brand-red/10'
  };
  return (
    <motion.button
      whileHover={{
        scale: 1.02
      }}
      whileTap={{
        scale: 0.98
      }}
      className={`${baseClasses} ${variants[variant]} ${widthClass} ${className}`}
      {...props}>
      
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>);

};
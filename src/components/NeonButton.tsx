import React from 'react';
import { motion } from 'framer-motion';

interface NeonButtonProps {
  variant?:  'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
  children:  React.ReactNode;
  onClick?:  () => void;
  disabled?: boolean;
  type?:     'button' | 'submit' | 'reset';
  className?: string;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  variant   = 'primary',
  fullWidth = false,
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
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
      'bg-transparent border-2 border-brand-red text-brand-red hover:bg-brand-red/10',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${widthClass} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};

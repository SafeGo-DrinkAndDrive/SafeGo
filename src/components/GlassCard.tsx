import React from 'react';
import { motion } from 'framer-motion';
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'red' | 'gray' | 'red-light' | 'none' | 'cyan' | 'purple' | 'pink'; // Kept old names for compatibility but mapped to new styles
  delay?: number;
}
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  delay = 0
}) => {
  // Map old neon colors to new brand colors
  const colorMap = {
    cyan: 'red',
    purple: 'gray',
    pink: 'red-light',
    red: 'red',
    gray: 'gray',
    'red-light': 'red-light',
    none: 'none'
  };
  const mappedColor = colorMap[glowColor as keyof typeof colorMap] || 'none';
  const glowClasses = {
    red: 'shadow-brand border-brand-red/30',
    gray: 'shadow-subtle border-brand-gray/30',
    'red-light': 'shadow-brand border-brand-red-light/30',
    none: 'border-white/10 shadow-subtle'
  };
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.5,
        delay
      }}
      className={`glass-panel rounded-2xl p-6 ${glowClasses[mappedColor as keyof typeof glowClasses]} ${className}`}>
      
      {children}
    </motion.div>);

};
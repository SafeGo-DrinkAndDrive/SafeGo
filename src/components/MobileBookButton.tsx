import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
export const MobileBookButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  // Only show on home page for logged-in users
  if (!isAuthenticated || location.pathname !== '/') return null;
  return (
    <motion.div
      initial={{
        y: 100,
        opacity: 0
      }}
      animate={{
        y: 0,
        opacity: 1
      }}
      transition={{
        delay: 1.5,
        type: 'spring',
        stiffness: 200
      }}
      className="fixed bottom-20 left-4 right-20 z-40 lg:hidden">
      
      <button
        onClick={() => {
          // Scroll to hero form
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
          // Focus the pickup input after scroll
          setTimeout(() => {
            const input = document.querySelector<HTMLInputElement>(
              'input[placeholder="Enter pickup location"]'
            );
            input?.focus();
          }, 500);
        }}
        className="w-full bg-brand-red text-white font-semibold py-4 rounded-2xl shadow-brand flex items-center justify-center gap-2 active:bg-brand-red-dark transition-colors">
        
        Book Now — Quick Ride
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>);

};
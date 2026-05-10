import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CustomTimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeOptions = useMemo(() => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour = String(h).padStart(2, '0');
        const minute = String(m).padStart(2, '0');
        options.push(`${hour}:${minute}`);
      }
    }
    return options;
  }, []);

  const formatDisplayTime = (time24: string) => {
    if (!time24) return '-- : --';
    const [h, m] = time24.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  useEffect(() => {
    if (isOpen && value && listRef.current) {
      // Scroll to selected value when opened
      const selectedIndex = timeOptions.findIndex(t => t === value);
      if (selectedIndex !== -1) {
        const itemHeight = 40; // approximate height of an item
        listRef.current.scrollTop = selectedIndex * itemHeight - (listRef.current.clientHeight / 2) + itemHeight / 2;
      }
    }
  }, [isOpen, value, timeOptions]);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Clock className="absolute left-4 top-3.5 h-4 w-4 text-text-sub pointer-events-none" />
        <div className={`w-full bg-background-darker/50 border ${isOpen ? 'border-brand-red' : 'border-white/10'} rounded-xl py-3 pl-11 pr-3 text-white transition-all`}>
          {value ? formatDisplayTime(value) : <span className="text-text-sub">-- : --</span>}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 w-full bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
          >
            <div 
              ref={listRef}
              className="max-h-64 overflow-y-auto py-2 custom-scrollbar"
              style={{ scrollBehavior: 'smooth' }}
            >
              {timeOptions.map((time) => {
                const isSelected = value === time;
                return (
                  <button
                    key={time}
                    onClick={() => {
                      onChange(time);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${isSelected ? 'bg-brand-red text-white font-medium' : 'text-text hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    {formatDisplayTime(time)}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

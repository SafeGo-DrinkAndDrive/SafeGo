import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, minDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize with selected date or today
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    // Format to YYYY-MM-DD
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${d}`);
    setIsOpen(false);
  };

  // Min date logic
  const minDateObj = minDate ? new Date(minDate) : new Date(0);
  minDateObj.setHours(0,0,0,0);

  const displayValue = value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date';

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="absolute left-4 top-3.5 h-4 w-4 text-text-sub pointer-events-none" />
        <div className={`w-full bg-background-darker/50 border ${isOpen ? 'border-brand-red' : 'border-white/10'} rounded-xl py-3 pl-11 pr-3 text-white transition-all`}>
          {value ? displayValue : <span className="text-text-sub">mm/dd/yyyy</span>}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 mt-2 p-4 w-72 bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-lg text-text-sub hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-white font-medium">
                {monthNames[currentMonth]} {currentYear}
              </div>
              <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-lg text-text-sub hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-medium text-text-sub py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateObj = new Date(currentYear, currentMonth, day);
                dateObj.setHours(0,0,0,0);
                const isDisabled = dateObj < minDateObj;
                
                const isSelected = value && 
                  new Date(value).getDate() === day && 
                  new Date(value).getMonth() === currentMonth && 
                  new Date(value).getFullYear() === currentYear;

                return (
                  <button
                    key={day}
                    disabled={isDisabled}
                    onClick={() => handleSelectDate(day)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all
                      ${isDisabled ? 'text-white/20 cursor-not-allowed' : 'hover:bg-white/10 text-white'}
                      ${isSelected ? 'bg-brand-red text-white hover:bg-brand-red font-medium' : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            
            <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
               <button 
                 onClick={() => { onChange(''); setIsOpen(false); }}
                 className="text-xs text-text-sub hover:text-white transition-colors"
               >
                 Clear
               </button>
               <button 
                 onClick={() => {
                   const today = new Date();
                   const year = today.getFullYear();
                   const month = String(today.getMonth() + 1).padStart(2, '0');
                   const d = String(today.getDate()).padStart(2, '0');
                   onChange(`${year}-${month}-${d}`);
                   setCurrentMonth(today.getMonth());
                   setCurrentYear(today.getFullYear());
                   setIsOpen(false);
                 }}
                 className="text-xs text-brand-red hover:text-brand-red/80 font-medium transition-colors"
               >
                 Today
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

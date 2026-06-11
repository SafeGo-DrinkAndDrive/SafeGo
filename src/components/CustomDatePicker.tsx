// ─── src/components/CustomDatePicker.tsx ─────────────────────────────────────
// Redesigned: premium glassmorphism calendar with:
//   • Red accent for selected day, subtle today ring
//   • Weekend day names dimmed
//   • Month navigation with year jump
//   • Smooth spring animation for dropdown
//   • UTC-safe date handling (no off-by-one in LK timezone)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function localToday(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
}

/** Parse YYYY-MM-DD safely as local midnight (no UTC shift). */
function parseLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  minDate,
}) => {
  const today = localToday();
  const seed = value || today;
  const seedDate = parseLocal(seed);

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(seedDate.getMonth());
  const [year, setYear] = useState(seedDate.getFullYear());
  const [dir, setDir] = useState(1); // animation direction
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();
  const minDateObj = minDate ? parseLocal(minDate) : null;

  const navigate = (delta: number) => {
    setDir(delta);
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  };

  const handleSelect = (day: number) => {
    const ymd = toYMD(year, month, day);
    onChange(ymd);
    setOpen(false);
  };

  const handleToday = () => {
    const t = parseLocal(today);
    setMonth(t.getMonth());
    setYear(t.getFullYear());
    onChange(today);
    setOpen(false);
  };

  const isDisabled = (day: number): boolean => {
    if (!minDateObj) return false;
    const d = new Date(year, month, day, 0, 0, 0, 0);
    return d < minDateObj;
  };

  const isSelected = (day: number): boolean => {
    if (!value) return false;
    return value === toYMD(year, month, day);
  };

  const isToday = (day: number): boolean => today === toYMD(year, month, day);

  // Display label
  const label = value
    ? parseLocal(value).toLocaleDateString("en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Pick a date";

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
          ${
            open
              ? "border-brand-red bg-brand-red/5 shadow-[0_0_0_3px_rgba(220,38,38,0.12)]"
              : "border-white/12 bg-background-darker/50 hover:border-white/25"
          }`}
      >
        <CalendarDays
          className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? "text-brand-red" : "text-text-sub"}`}
        />
        <span
          className={`text-sm font-medium flex-1 ${value ? "text-white" : "text-text-sub"}`}
        >
          {label}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-text-sub hover:bg-white/20 hover:text-white transition-all text-xs"
          >
            ×
          </button>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 mt-2 z-50 w-80 p-4
              bg-[#141414]/96 backdrop-blur-2xl
              border border-white/10 rounded-2xl
              shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  {MONTHS[month]}
                </p>
                <p className="text-xs text-text-sub">{year}</p>
              </div>

              <button
                type="button"
                onClick={() => navigate(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-sub hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-medium py-1 ${
                    i === 0 || i === 6 ? "text-brand-red/60" : "text-text-sub"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <motion.div
              key={`${year}-${month}`}
              initial={{ opacity: 0, x: dir * 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-7 gap-0.5"
            >
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (day) => {
                  const disabled = isDisabled(day);
                  const selected = isSelected(day);
                  const todayDay = isToday(day);
                  const dow = (firstDayOffset + day - 1) % 7;
                  const isWeekend = dow === 0 || dow === 6;

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelect(day)}
                      className={`
                      relative h-9 w-full rounded-lg flex items-center justify-center text-sm
                      transition-all duration-150 font-medium
                      ${
                        disabled
                          ? "text-white/15 cursor-not-allowed"
                          : selected
                            ? "bg-brand-red text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                            : todayDay
                              ? "text-brand-red hover:bg-brand-red/15"
                              : isWeekend
                                ? "text-white/60 hover:bg-white/8 hover:text-white"
                                : "text-white hover:bg-white/8"
                      }
                    `}
                    >
                      {day}
                      {todayDay && !selected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-red" />
                      )}
                    </button>
                  );
                },
              )}
            </motion.div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs text-text-sub hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-xs font-semibold text-brand-red hover:text-brand-red/80 transition-colors"
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

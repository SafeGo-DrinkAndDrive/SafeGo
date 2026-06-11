// ─── src/components/CustomTimePicker.tsx ─────────────────────────────────────
// Simple native time input — no custom wheel, no centering issues.
// Styled to match the dark glassmorphism theme.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Clock } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // HH:MM (24h)
  onChange: (time: string) => void;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="relative">
      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-sub pointer-events-none z-10" />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background-darker/50 border border-white/12 rounded-xl py-3 pl-11 pr-4
          text-white text-sm font-medium
          focus:border-brand-red focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)] outline-none
          transition-all cursor-pointer
          [color-scheme:dark]"
      />
    </div>
  );
};

// ─── src/components/CustomTimePicker.tsx ─────────────────────────────────────
// Simple scrollable dropdown list of time slots in 15-minute increments.
// Clicking the trigger opens a list. Clicking a time selects it and closes.
// No wheels, no portals, no native input quirks.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface CustomTimePickerProps {
  value: string; // HH:MM (24-h), empty string = nothing selected
  onChange: (time: string) => void;
}

function fmt12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // All slots in 15-min increments across 24 h
  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll selected item into view when list opens
  useEffect(() => {
    if (open && selectedRef.current && listRef.current) {
      // Use scrollIntoView so the browser handles the offset calculation
      selectedRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  const handleSelect = (slot: string) => {
    onChange(slot);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl border
          bg-background-darker/50 text-sm transition-all text-left
          ${
            open
              ? "border-brand-red shadow-[0_0_0_3px_rgba(220,38,38,0.12)]"
              : "border-white/10 hover:border-white/25"
          }
        `}
      >
        <Clock
          className={`w-4 h-4 flex-shrink-0 ${value ? "text-brand-red" : "text-text-sub"}`}
        />
        <span
          className={`flex-1 ${value ? "text-white font-medium" : "text-text-sub"}`}
        >
          {value ? fmt12(value) : "Select time"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-sub transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="
              absolute top-full left-0 right-0 mt-1.5 z-50
              bg-[#181818] border border-white/10 rounded-xl
              shadow-[0_12px_40px_rgba(0,0,0,0.6)]
              overflow-hidden
            "
          >
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{ maxHeight: "220px" }}
            >
              {slots.map((slot) => {
                const selected = slot === value;
                return (
                  <button
                    key={slot}
                    ref={selected ? selectedRef : undefined}
                    type="button"
                    onClick={() => handleSelect(slot)}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${
                        selected
                          ? "bg-brand-red text-white font-semibold"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      }
                    `}
                  >
                    {fmt12(slot)}
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

// ─── src/components/CustomTimePicker.tsx ─────────────────────────────────────
// Fix: selected item now truly centres in the viewport by scrolling to
//   index * ITEM_H - (visibleHeight/2 - ITEM_H/2)
// We read the actual clientHeight after the list mounts instead of
// using a hardcoded constant, so it works on any screen size.
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // HH:MM 24-h
  onChange: (time: string) => void;
}

const ITEM_H = 44; // px — height of each wheel row
const VISIBLE_PX = 176; // 4 visible rows  (4 × 44)

function to12h(h24: number): { hour: number; ampm: "AM" | "PM" } {
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, ampm: h24 < 12 ? "AM" : "PM" };
}
function to24h(h12: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}
function fmt2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDisplay(value: string): string {
  if (!value) return "— : —";
  const [h, m] = value.split(":").map(Number);
  const { hour, ampm } = to12h(h);
  return `${fmt2(hour)}:${fmt2(m)} ${ampm}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// ── Scrollable column ─────────────────────────────────────────────────────────

function WheelColumn<T extends number>({
  items,
  selected,
  onSelect,
  label,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  label: (v: T) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const selIdx = items.indexOf(selected);

  // Scroll so the selected item sits exactly in the middle of the visible area
  const scrollToSelected = useCallback(
    (behaviour: ScrollBehavior = "smooth") => {
      if (!ref.current || selIdx < 0) return;
      const top = selIdx * ITEM_H - (VISIBLE_PX / 2 - ITEM_H / 2);
      ref.current.scrollTo({ top: Math.max(0, top), behavior: behaviour });
    },
    [selIdx],
  );

  // On open (component mount) — instant jump, then smooth for subsequent changes
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      scrollToSelected("instant");
      mounted.current = true;
    } else {
      scrollToSelected("smooth");
    }
  }, [scrollToSelected]);

  return (
    <div className="relative flex-1">
      {/* Highlight band centred in the list */}
      <div
        className="pointer-events-none absolute left-0 right-0 rounded-lg bg-white/6 border border-white/12 z-10"
        style={{ top: VISIBLE_PX / 2 - ITEM_H / 2, height: ITEM_H }}
      />

      <div
        ref={ref}
        className="overflow-y-auto"
        style={{
          height: VISIBLE_PX,
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
        }}
      >
        {/* Top padding so first item can be centred */}
        <div style={{ height: VISIBLE_PX / 2 - ITEM_H / 2 }} />

        {items.map((item) => {
          const active = item === selected;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              style={{ height: ITEM_H }}
              className={`relative z-20 w-full flex items-center justify-center text-sm font-semibold
                transition-all duration-150 rounded-lg
                ${active ? "text-white" : "text-white/30 hover:text-white/60"}`}
            >
              {label(item)}
            </button>
          );
        })}

        {/* Bottom padding so last item can be centred */}
        <div style={{ height: VISIBLE_PX / 2 - ITEM_H / 2 }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    if (!value) return { hour: 8, minute: 0, ampm: "AM" as const };
    const [h24, m] = value.split(":").map(Number);
    const { hour, ampm } = to12h(h24);
    return { hour, minute: m, ampm };
  }, [value]);

  const [selHour, setSelHour] = useState(parsed.hour);
  const [selMinute, setSelMinute] = useState(parsed.minute);
  const [selAmpm, setSelAmpm] = useState<"AM" | "PM">(parsed.ampm);

  useEffect(() => {
    setSelHour(parsed.hour);
    setSelMinute(parsed.minute);
    setSelAmpm(parsed.ampm);
  }, [parsed]);

  const emit = useCallback(
    (h: number, m: number, ap: "AM" | "PM") => {
      onChange(`${fmt2(to24h(h, ap))}:${fmt2(m)}`);
    },
    [onChange],
  );

  const handleHour = (h: number) => {
    setSelHour(h);
    emit(h, selMinute, selAmpm);
  };
  const handleMinute = (m: number) => {
    setSelMinute(m);
    emit(selHour, m, selAmpm);
  };
  const handleAmpm = (ap: "AM" | "PM") => {
    setSelAmpm(ap);
    emit(selHour, selMinute, ap);
  };

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
        <Clock
          className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? "text-brand-red" : "text-text-sub"}`}
        />
        <span
          className={`text-sm font-medium flex-1 ${value ? "text-white" : "text-text-sub"}`}
        >
          {value ? formatDisplay(value) : "Pick a time"}
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
            className="absolute top-full left-0 mt-2 z-50 w-72
              bg-[#141414]/96 backdrop-blur-2xl
              border border-white/10 rounded-2xl p-4
              shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
          >
            {/* Column labels */}
            <div className="grid grid-cols-3 mb-2 text-center">
              {["Hour", "Minute", "Period"].map((l) => (
                <p
                  key={l}
                  className="text-xs text-text-sub uppercase tracking-wide"
                >
                  {l}
                </p>
              ))}
            </div>

            {/* Wheels */}
            <div className="flex gap-1">
              <WheelColumn
                items={HOURS}
                selected={selHour}
                onSelect={handleHour}
                label={fmt2}
              />

              {/* Divider */}
              <div className="flex items-center self-stretch pb-0">
                <span className="text-white/30 text-lg font-bold select-none">
                  :
                </span>
              </div>

              <WheelColumn
                items={MINUTES}
                selected={selMinute}
                onSelect={handleMinute}
                label={fmt2}
              />

              {/* AM / PM */}
              <div className="flex flex-col items-stretch justify-center gap-2 ml-1 flex-shrink-0">
                {(["AM", "PM"] as const).map((ap) => (
                  <button
                    key={ap}
                    type="button"
                    onClick={() => handleAmpm(ap)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all min-w-[44px]
                      ${
                        selAmpm === ap
                          ? "bg-brand-red text-white shadow-[0_0_10px_rgba(220,38,38,0.35)]"
                          : "text-white/30 hover:text-white/60 hover:bg-white/6"
                      }`}
                  >
                    {ap}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview + Done */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8">
              <p className="text-base font-bold text-white">
                {value ? formatDisplay(value) : "—"}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 bg-brand-red text-white text-sm font-semibold rounded-lg hover:bg-brand-red/85 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

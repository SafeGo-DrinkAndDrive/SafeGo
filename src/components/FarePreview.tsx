// ─── src/components/FarePreview.tsx ──────────────────────────────────────────
// Fix: removed import from '../utils/fareCalculator' (deleted in Phase 3).
// formatCurrency is now inlined here.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { motion } from "framer-motion";
import { Receipt, Info } from "lucide-react";
import type { FareBreakdown } from "../types";

// Inline — fareCalculator.ts has been removed
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FarePreviewProps {
  breakdown: FareBreakdown | null;
  isLoading?: boolean;
}

export const FarePreview: React.FC<FarePreviewProps> = ({
  breakdown,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-background-darker/80 rounded-xl p-6 border border-white/5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-8 bg-white/10 rounded w-1/2" />
      </div>
    );
  }

  if (!breakdown) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background-darker/80 rounded-xl p-6 border border-brand-red/20 shadow-subtle"
    >
      <div className="flex items-center gap-2 mb-4 text-brand-red">
        <Receipt className="w-5 h-5" />
        <h3 className="font-semibold">Fare Estimate</h3>
      </div>

      <div className="space-y-3 mb-6">
        {breakdown.breakdown.baseFare && (
          <div className="flex justify-between text-sm">
            <span className="text-text-sub">Base Fare (First 10km)</span>
            <span className="text-white">
              {formatCurrency(breakdown.breakdown.baseFare)}
            </span>
          </div>
        )}
        {breakdown.breakdown.distanceFare &&
          breakdown.breakdown.distanceFare > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-sub">
                Additional Distance ({(breakdown.distance - 10).toFixed(1)}km)
              </span>
              <span className="text-white">
                {formatCurrency(breakdown.breakdown.distanceFare)}
              </span>
            </div>
          )}
        {breakdown.breakdown.hourlyFare && (
          <div className="flex justify-between text-sm">
            <span className="text-text-sub">
              Hourly Rate ({breakdown.duration}h)
            </span>
            <span className="text-white">
              {formatCurrency(breakdown.breakdown.hourlyFare)}
            </span>
          </div>
        )}
        {breakdown.breakdown.packageFare && (
          <div className="flex justify-between text-sm">
            <span className="text-text-sub">Package Rate</span>
            <span className="text-white">
              {formatCurrency(breakdown.breakdown.packageFare)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-white/10 flex justify-between items-end">
        <div>
          <p className="text-xs text-text-sub flex items-center gap-1">
            <Info className="w-3 h-3" /> Estimated Total
          </p>
        </div>
        <span className="text-3xl font-bold text-brand-red text-glow-red">
          {formatCurrency(breakdown.estimatedFare)}
        </span>
      </div>
    </motion.div>
  );
};

// ─── src/components/ServicesPackages.tsx ─────────────────────────────────────
// Pricing is now fetched from the active Firestore fare rules instead of
// being hardcoded. Falls back to sensible defaults if no rule is configured.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "./GlassCard";
import { NeonButton } from "./NeonButton";
import { getActiveFareRule } from "../services/fareRulesService";
import { useAuth } from "../contexts/AuthContext";
import type { FareRule } from "../types";

// ── Price string builders ─────────────────────────────────────────────────────

function buildDistancePrice(rule: FareRule | null): {
  price: string;
  details: string;
} {
  if (!rule?.tiers?.length) {
    return { price: "LKR 1,800", details: "Base 10 km + LKR 100/km" };
  }
  const sorted = [...rule.tiers].sort((a, b) => a.minKm - b.minKm);
  const firstTier = sorted[0];
  const baseCharge = firstTier.baseCharge;
  const rate = firstTier.ratePerKm;

  if (baseCharge > 0) {
    return {
      price: `LKR ${baseCharge.toLocaleString()}`,
      details: `Base charge + LKR ${rate}/km`,
    };
  }
  return {
    price: `LKR ${rate}/km`,
    details: `${sorted.length} distance tier${sorted.length > 1 ? "s" : ""}`,
  };
}

function buildHourlyPrice(rule: FareRule | null): {
  price: string;
  details: string;
} {
  if (!rule?.flatRates) {
    return { price: "From LKR 2,500", details: "Starting at 1 hour" };
  }
  const rates = Object.entries(rule.flatRates).sort(
    ([a], [b]) => parseInt(a) - parseInt(b),
  );
  if (!rates.length)
    return { price: "From LKR 2,500", details: "Starting at 1 hour" };

  const [slot, lowestFare] = rates[0];
  return {
    price: `From LKR ${lowestFare.toLocaleString()}`,
    details: `Starting at ${slot}`,
  };
}

function buildFullDayPrice(rule: FareRule | null): {
  price: string;
  details: string;
} {
  if (!rule?.flatRates) {
    return { price: "From LKR 5,000", details: "Starting at 4 hours" };
  }
  const rates = Object.entries(rule.flatRates).sort(
    ([a], [b]) => parseInt(a) - parseInt(b),
  );
  if (!rates.length)
    return { price: "From LKR 5,000", details: "Starting at 4 hours" };

  const [slot, lowestFare] = rates[0];
  return {
    price: `From LKR ${lowestFare.toLocaleString()}`,
    details: `Starting at ${slot}`,
  };
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="glass-panel rounded-2xl p-6 border border-white/10 animate-pulse">
    <div className="w-16 h-16 rounded-2xl bg-white/10 mb-6" />
    <div className="h-6 bg-white/10 rounded w-3/4 mb-3" />
    <div className="h-4 bg-white/10 rounded w-full mb-2" />
    <div className="h-4 bg-white/10 rounded w-4/5 mb-8" />
    <div className="h-9 bg-white/10 rounded w-2/5 mb-2" />
    <div className="h-4 bg-white/10 rounded w-1/2 mb-8" />
    <div className="h-11 bg-white/10 rounded-xl w-full" />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const ServicesPackages: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, vehicleRegistered } = useAuth();

  const [distanceRule, setDistanceRule] = useState<FareRule | null>(null);
  const [hourlyRule, setHourlyRule] = useState<FareRule | null>(null);
  const [fullDayRule, setFullDayRule] = useState<FareRule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getActiveFareRule("Distance"),
      getActiveFareRule("Hourly"),
      getActiveFareRule("Full Day"),
    ])
      .then(([d, h, f]) => {
        if (cancelled) return;
        setDistanceRule(d);
        setHourlyRule(h);
        setFullDayRule(f);
      })
      .catch(() => {
        // Silently fall back to defaults on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }
    if (!vehicleRegistered) {
      navigate("/vehicle-setup");
      return;
    }
    navigate("/booking");
  };

  const distancePricing = buildDistancePrice(distanceRule);
  const hourlyPricing = buildHourlyPrice(hourlyRule);
  const fullDayPricing = buildFullDayPrice(fullDayRule);

  const packages = [
    {
      icon: MapPin,
      title: "Distance Package",
      description: "Perfect for point-to-point trips across the city",
      price: distancePricing.price,
      details: distancePricing.details,
      color: "red" as const,
    },
    {
      icon: Clock,
      title: "Hourly Package",
      description: "Flexible hourly rates for multiple stops",
      price: hourlyPricing.price,
      details: hourlyPricing.details,
      color: "gray" as const,
    },
    {
      icon: Calendar,
      title: "Full Day Package",
      description: "All-day service for events and long trips",
      price: fullDayPricing.price,
      details: fullDayPricing.details,
      color: "red-light" as const,
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Our <span className="text-brand-red text-glow-red">Packages</span>
          </h2>
          <p className="text-lg text-text-sub max-w-2xl mx-auto">
            Choose the package that fits your journey
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {loading ? (
            // Skeleton placeholders while Firestore loads
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            packages.map((pkg, index) => {
              const Icon = pkg.icon;

              const iconBg =
                pkg.color === "red"
                  ? "bg-brand-red/10 border border-brand-red/20"
                  : pkg.color === "gray"
                    ? "bg-brand-gray/10 border border-brand-gray/20"
                    : "bg-brand-red-light/10 border border-brand-red-light/20";

              const iconColor =
                pkg.color === "red"
                  ? "text-brand-red"
                  : pkg.color === "gray"
                    ? "text-brand-gray"
                    : "text-brand-red-light";

              const priceColor =
                pkg.color === "red"
                  ? "text-brand-red"
                  : pkg.color === "gray"
                    ? "text-brand-gray"
                    : "text-brand-red-light";

              const btnVariant = pkg.color === "gray" ? "secondary" : "primary";

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  whileHover={{ y: -8 }}
                >
                  <GlassCard
                    glowColor={pkg.color}
                    className="h-full flex flex-col group hover:shadow-subtle transition-shadow duration-300"
                  >
                    <div className="flex-grow space-y-6">
                      {/* Icon */}
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className={`inline-flex p-4 rounded-2xl ${iconBg}`}
                      >
                        <Icon className={`w-8 h-8 ${iconColor}`} />
                      </motion.div>

                      {/* Title + description */}
                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold">{pkg.title}</h3>
                        <p className="text-text-sub">{pkg.description}</p>
                      </div>

                      {/* Price — live from Firestore */}
                      <div className="space-y-2">
                        <p className={`text-3xl font-bold ${priceColor}`}>
                          {pkg.price}
                        </p>
                        <p className="text-sm text-text-sub">{pkg.details}</p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="mt-6">
                      <NeonButton
                        fullWidth
                        variant={btnVariant}
                        onClick={handleBookNow}
                      >
                        Book Now <ArrowRight className="w-4 h-4 ml-2" />
                      </NeonButton>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Live pricing note */}
        {!loading && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-text-sub mt-8"
          >
            Prices are live and may vary. Final fare is calculated at booking.
          </motion.p>
        )}
      </div>
    </section>
  );
};

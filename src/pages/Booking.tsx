// ─── src/pages/Booking.tsx ────────────────────────────────────────────────────
// Fix: Immediate booking now uses Math.max(calculatedFare, immediateBaseFare)
// instead of replacing the fare entirely. The distance calculation still runs
// normally — the immediateBaseFare is a minimum floor, not a flat override.
//
// Example with 2,500 base + 100/km rule:
//   5 km  → calc=2,500  floor=3,000  → final=3,000 (floor wins)
//   25 km → calc=4,000  floor=3,000  → final=4,000 (calc wins)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Clock,
  AlertCircle,
  Loader2,
  Locate,
  LocateFixed,
  Route,
  Receipt,
  TrendingUp,
  Info,
  Zap,
  ShieldCheck,
  Timer,
  CalendarDays,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { NeonButton } from "../components/NeonButton";
import { LocationInput } from "../components/LocationInput";
import { CustomDatePicker } from "../components/CustomDatePicker";
import { CustomTimePicker } from "../components/CustomTimePicker";
import { useAuth } from "../contexts/AuthContext";
import { useBookings } from "../hooks/useBookings";
import {
  calculateDynamicFare,
  calculateFlatFareDynamic,
  reverseGeocode,
} from "../services/fareRulesService";
import {
  getBookingPolicy,
  classifyBookingTime,
  toBookingType,
  getMinutesUntilPickup,
  type TimeClassification,
} from "../services/bookingPolicyService";
import type {
  ServiceType,
  PlaceResult,
  CreateBookingPayload,
  FarePricingResult,
  BookingPolicy,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMins(mins: number): string {
  if (!mins || mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Time classification banner ────────────────────────────────────────────────

const TimeBanner: React.FC<{
  cls: TimeClassification;
  policy: BookingPolicy;
  minsAway: number;
}> = ({ cls, policy, minsAway }) => {
  if (cls === "standard") return null;

  if (cls === "blocked") {
    return (
      <motion.div
        key="blocked"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25"
      >
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-400">
            Can't book this time slot
          </p>
          <p className="text-xs text-red-300/80 mt-0.5 leading-relaxed">
            Bookings need at least{" "}
            <span className="font-bold text-red-300">
              {policy.minAdvanceMins} minutes
            </span>{" "}
            notice. Your selected time is only{" "}
            <span className="font-bold text-red-300">
              {Math.max(0, Math.floor(minsAway))} min
            </span>{" "}
            away. Please pick a later slot.
          </p>
        </div>
      </motion.div>
    );
  }

  // immediate
  return (
    <motion.div
      key="immediate"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25"
    >
      <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-400 mb-0.5">
          Immediate Booking — pickup in ~{Math.floor(minsAway)} min
        </p>
        <p className="text-xs text-amber-300/80 leading-relaxed">
          Your pickup is within{" "}
          <span className="font-bold text-amber-300">
            {policy.immediateThresholdMins} minutes
          </span>
          . A minimum fare of{" "}
          <span className="font-bold text-amber-300">
            LKR {policy.immediateBaseFare.toLocaleString()}
          </span>{" "}
          applies — your distance fare may be higher. Driver availability
          subject to confirmation.
        </p>
      </div>
    </motion.div>
  );
};

// ── Fare card ─────────────────────────────────────────────────────────────────

const FareCard: React.FC<{
  fare: FarePricingResult;
  serviceType: ServiceType;
  cls: TimeClassification;
  policy: BookingPolicy;
}> = ({ fare, serviceType, cls, policy }) => {
  const isImmediate = cls === "immediate";

  // ── KEY FIX: use the higher of calculated fare vs immediate minimum ────────
  const displayFare = isImmediate
    ? Math.max(fare.fare, policy.immediateBaseFare)
    : fare.fare;

  const floorApplied = isImmediate && policy.immediateBaseFare > fare.fare;
  const calcWins = isImmediate && fare.fare > policy.immediateBaseFare;

  const fareSubLabel = isImmediate
    ? floorApplied
      ? `Minimum fare applied (calc was LKR ${fare.fare.toLocaleString()})`
      : calcWins
        ? "Distance fare applies (higher than minimum)"
        : "Distance fare equals minimum"
    : "*Subject to waiting charges";

  return (
    <GlassCard glowColor={isImmediate ? "gray" : "red"}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/8">
        <div
          className={`p-2 rounded-lg ${isImmediate ? "bg-amber-500/15" : "bg-brand-red/15"}`}
        >
          {isImmediate ? (
            <Zap className="w-4 h-4 text-amber-400" />
          ) : (
            <Receipt className="w-4 h-4 text-brand-red" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {isImmediate ? "Immediate Booking" : "Fare Estimate"}
          </p>
          <p className="text-xs text-text-sub">
            {isImmediate
              ? calcWins
                ? "Distance fare · higher than minimum"
                : `Minimum LKR ${policy.immediateBaseFare.toLocaleString()} applied`
              : `${fare.fareRuleName} · shortest route`}
          </p>
        </div>
        <span
          className={`ml-auto text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
            isImmediate
              ? "bg-amber-400/10 text-amber-400 border-amber-400/20"
              : "bg-green-400/10 text-green-400 border-green-400/20"
          }`}
        >
          {isImmediate ? "Immediate" : "Standard"}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        {serviceType === "Distance" && (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-text-sub text-sm">
                <Route className="w-3.5 h-3.5" /> Distance
              </div>
              <span className="text-white font-medium">
                {fare.distanceKm} km
              </span>
            </div>
            {fare.durationMins > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <Timer className="w-3.5 h-3.5" /> Est. travel time
                </div>
                <span className="text-white font-medium">
                  {fmtMins(fare.durationMins)}
                </span>
              </div>
            )}
            {fare.breakdown.tierUsed && (
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <TrendingUp className="w-3.5 h-3.5" /> Rate
                </div>
                <span className="text-white font-medium text-right text-sm max-w-[55%] leading-snug">
                  {fare.breakdown.tierUsed}
                </span>
              </div>
            )}
            {fare.breakdown.baseCharge > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <Receipt className="w-3.5 h-3.5" /> Base charge
                </div>
                <span className="text-white font-medium">
                  LKR {fare.breakdown.baseCharge.toLocaleString()}
                </span>
              </div>
            )}
            {/* Show distance charge breakdown */}
            {fare.breakdown.distanceCharge > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <Route className="w-3.5 h-3.5" /> Distance charge
                </div>
                <span className="text-white font-medium">
                  LKR {fare.breakdown.distanceCharge.toLocaleString()}
                </span>
              </div>
            )}
            {/* Show immediate minimum floor when it applies */}
            {isImmediate && floorApplied && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-amber-400/80 text-sm">
                  <Zap className="w-3.5 h-3.5" /> Immediate minimum
                </div>
                <span className="text-amber-400 font-medium">
                  LKR {policy.immediateBaseFare.toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}
        {serviceType !== "Distance" && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-text-sub text-sm">
              <Clock className="w-3.5 h-3.5" /> Duration
            </div>
            <span className="text-white font-medium">
              {fmtMins(fare.durationMins)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div
        className={`rounded-xl p-4 flex items-center justify-between border ${
          isImmediate
            ? "bg-amber-500/8 border-amber-500/20"
            : "bg-brand-red/8 border-brand-red/20"
        }`}
      >
        <div>
          <p className="text-xs text-text-sub">Total Fare</p>
          <p className="text-xs text-text-sub/50 mt-0.5">{fareSubLabel}</p>
        </div>
        <p
          className={`text-3xl font-bold tracking-tight ${
            isImmediate ? "text-amber-400" : "text-brand-red"
          }`}
        >
          LKR {displayFare.toLocaleString()}
        </p>
      </div>

      {!isImmediate && fare.fareRuleId === "fallback" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
          <AlertCircle className="w-3 h-3" /> No pricing rule configured —
          default rates applied
        </div>
      )}
    </GlassCard>
  );
};

// ── Waiting policy — Distance only ────────────────────────────────────────────

const WaitingPolicy: React.FC<{ policy: BookingPolicy }> = ({ policy }) => (
  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2.5">
    <div className="flex items-center gap-2 mb-1">
      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <p className="text-sm font-semibold text-white">
        Trip Duration & Waiting Policy
      </p>
    </div>
    {[
      "Estimated travel time is calculated using Google Maps and shown in the fare card above.",
      `The first ${policy.freeWaitingMins} minutes of delays beyond the estimated duration are free — no extra charge.`,
      `After that, LKR ${policy.waitingChargePerInterval.toLocaleString()} is added for every ${policy.waitingIntervalMins} minutes of additional waiting time.`,
      "Any waiting charges are added to your final fare at the end of the trip.",
    ].map((line, i) => (
      <div key={i} className="flex items-start gap-2">
        <span className="text-blue-400 flex-shrink-0 mt-0.5 text-xs">•</span>
        <p className="text-xs text-blue-300/80 leading-relaxed">{line}</p>
      </div>
    ))}
  </div>
);

// ── Service type selector ─────────────────────────────────────────────────────

const SERVICE_TYPES: {
  type: ServiceType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "Distance",
    label: "By Distance",
    icon: <Route className="w-4 h-4" />,
  },
  { type: "Hourly", label: "Hourly", icon: <Clock className="w-4 h-4" /> },
  {
    type: "Full Day",
    label: "Full Day",
    icon: <CalendarDays className="w-4 h-4" />,
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createBooking } = useBookings();

  const [pickup, setPickup] = useState<PlaceResult | null>(null);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);

  const [serviceType, setServiceType] = useState<ServiceType>("Distance");
  const [serviceDetail, setServiceDetail] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [fareResult, setFareResult] = useState<FarePricingResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [policy, setPolicy] = useState<BookingPolicy | null>(null);
  const [timeCls, setTimeCls] = useState<TimeClassification>("standard");
  const [minsAway, setMinsAway] = useState<number>(Infinity);

  const [isBooking, setIsBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);

  // Fetch policy once
  useEffect(() => {
    getBookingPolicy()
      .then((p) => {
        setPolicy(p);
        if (!serviceDetail) setServiceDetail(p.hourlySlots[0] ?? "2h");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-classify on date/time change
  useEffect(() => {
    if (!policy || !scheduledDate || !scheduledTime) {
      setTimeCls("standard");
      setMinsAway(Infinity);
      return;
    }
    const mins = getMinutesUntilPickup(scheduledDate, scheduledTime);
    setMinsAway(mins);
    setTimeCls(classifyBookingTime(scheduledDate, scheduledTime, policy));
  }, [scheduledDate, scheduledTime, policy]);

  // Slot arrays from policy
  const hourlySlots = policy?.hourlySlots ?? ["2h", "3h", "4h", "5h"];
  const fullDaySlots = policy?.fullDaySlots ?? ["6h", "12h", "24h", "48h"];
  const durationOpts = serviceType === "Hourly" ? hourlySlots : fullDaySlots;

  const handleServiceTypeChange = (type: ServiceType) => {
    setServiceType(type);
    setFareResult(null);
    if (type === "Hourly") setServiceDetail((policy?.hourlySlots ?? ["2h"])[0]);
    if (type === "Full Day")
      setServiceDetail((policy?.fullDaySlots ?? ["6h"])[0]);
    if (type === "Distance") setServiceDetail("");
  };

  // Fare calculation
  const recalcFare = useCallback(
    (
      p: PlaceResult | null,
      d: PlaceResult | null,
      sType: ServiceType,
      sDetail: string,
    ) => {
      clearTimeout(debounceRef.current);
      setFareError(null);

      if (sType === "Distance") {
        if (!p || !d) {
          setFareResult(null);
          return;
        }
        setCalculating(true);
        debounceRef.current = setTimeout(async () => {
          try {
            setFareResult(await calculateDynamicFare(p.coords, d.coords));
          } catch (e: unknown) {
            setFareError((e as Error).message ?? "Could not calculate fare.");
            setFareResult(null);
          } finally {
            setCalculating(false);
          }
        }, 600);
      } else {
        if (!sDetail) return;
        setCalculating(true);
        debounceRef.current = setTimeout(async () => {
          try {
            setFareResult(
              await calculateFlatFareDynamic(
                sType as "Hourly" | "Full Day",
                sDetail,
              ),
            );
          } catch (e: unknown) {
            setFareError((e as Error).message ?? "Could not load pricing.");
            setFareResult(null);
          } finally {
            setCalculating(false);
          }
        }, 300);
      }
    },
    [],
  );

  useEffect(() => {
    recalcFare(pickup, dropoff, serviceType, serviceDetail);
    return () => clearTimeout(debounceRef.current);
  }, [pickup, dropoff, serviceType, serviceDetail, recalcFare]);

  // Geolocation
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          setPickup({
            address: await reverseGeocode(lat, lng),
            placeId: `geo_${lat}_${lng}`,
            coords: { lat, lng },
          });
        } catch {
          setLocError("Could not read your address. Please type it manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === 1
            ? "Location permission denied. Please allow access or type your address."
            : "Location unavailable. Please try again.",
        );
      },
      { timeout: 10000, maximumAge: 30000 },
    );
  };

  // Validation
  const validate = (): string | null => {
    if (serviceType === "Distance" && !pickup)
      return "Please select a pickup location.";
    if (serviceType === "Distance" && !dropoff)
      return "Please select a drop-off location.";
    if (!scheduledDate || !scheduledTime)
      return "Please select a date and time.";
    if (timeCls === "blocked")
      return `Bookings need at least ${policy?.minAdvanceMins ?? 40} minutes' notice. Please pick a later time.`;
    if (!fareResult) return "Please wait while fare is being calculated.";
    return null;
  };

  // Submit
  const handleBook = async () => {
    const err = validate();
    if (err) {
      setBookingErr(err);
      return;
    }
    if (!policy) return;

    setIsBooking(true);
    setBookingErr(null);

    const bookingType = toBookingType(timeCls);

    // ── KEY FIX ───────────────────────────────────────────────────────────────
    // Immediate booking uses the HIGHER of:
    //   - The normal distance-calculated fare (base + per-km)
    //   - The admin-configured immediate minimum (e.g. LKR 3,000)
    //
    // This means short trips still get the minimum, but long trips pay the
    // full calculated fare. The immediate flag only sets a price floor.
    const finalFare =
      bookingType === "immediate"
        ? Math.max(fareResult!.fare, policy.immediateBaseFare)
        : fareResult!.fare;
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const payload: CreateBookingPayload = {
        pickupLocation: pickup?.address ?? "N/A",
        pickupCoords: pickup?.coords ?? { lat: 6.9271, lng: 79.8612 },
        dropLocation: dropoff?.address ?? "N/A",
        dropCoords: dropoff?.coords ?? { lat: 6.9271, lng: 79.8612 },
        serviceType,
        serviceDetail: serviceType !== "Distance" ? serviceDetail : undefined,
        scheduledDate,
        scheduledTime,
      };

      const booking = await createBooking(
        payload,
        finalFare,
        fareResult!.distanceKm,
        fareResult!.durationMins,
        fareResult!.fareRuleId,
        bookingType,
        fareResult!.durationMins,
      );

      navigate("/booking-success", {
        state: { booking, userPhone: user?.phone, bookingType, policy },
      });
    } catch (e: unknown) {
      setBookingErr(
        (e as Error).message ?? "Booking failed. Please try again.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  const todayLocal = new Date().toLocaleDateString("en-CA");
  const isBlocked = timeCls === "blocked";
  const canSubmit =
    !isBlocked &&
    !calculating &&
    !!fareResult &&
    !!scheduledDate &&
    !!scheduledTime;
  const showWaitingPolicy =
    serviceType === "Distance" && policy && fareResult && !calculating;

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Book a Driver</h1>
          <p className="text-text-sub text-sm mt-1">
            Hi {user?.name.split(" ")[0]}! Let's get your ride sorted.
          </p>
        </div>

        {/* Service type */}
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => handleServiceTypeChange(type)}
              className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border transition-all ${
                serviceType === type
                  ? "border-brand-red bg-brand-red/10 text-white"
                  : "border-white/10 text-text-sub hover:border-white/20 hover:text-white"
              }`}
            >
              {icon}
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <GlassCard glowColor="red">
          <div className="space-y-5">
            {/* Distance: pickup + dropoff */}
            {serviceType === "Distance" && (
              <>
                <div>
                  <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                    Pickup Location
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <LocationInput
                        placeholder="Where are you?"
                        value={pickup?.address ?? ""}
                        onChange={setPickup}
                        icon={<MapPin className="h-5 w-5 text-brand-red" />}
                      />
                    </div>
                    <button
                      onClick={handleUseLocation}
                      disabled={locating}
                      className="px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-text-sub hover:text-white transition-all disabled:opacity-50"
                      title="Use current location"
                    >
                      {locating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : pickup ? (
                        <LocateFixed className="w-5 h-5 text-brand-red" />
                      ) : (
                        <Locate className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {locError && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {locError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                    Drop-off Location
                  </label>
                  <LocationInput
                    placeholder="Where to?"
                    value={dropoff?.address ?? ""}
                    onChange={setDropoff}
                    icon={<Navigation className="h-5 w-5 text-text-sub" />}
                  />
                </div>
              </>
            )}

            {/* Hourly / Full Day: duration + start location */}
            {serviceType !== "Distance" && (
              <>
                <div>
                  <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                    Duration
                  </label>
                  {!policy ? (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex-1 h-10 rounded-xl bg-white/5 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`grid gap-2 ${durationOpts.length <= 4 ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-6"}`}
                    >
                      {durationOpts.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setServiceDetail(opt)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            serviceDetail === opt
                              ? "border-brand-red bg-brand-red/10 text-white"
                              : "border-white/10 text-text-sub hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                    Starting Location
                  </label>
                  <LocationInput
                    placeholder="Where should the driver meet you?"
                    value={pickup?.address ?? ""}
                    onChange={setPickup}
                    icon={<MapPin className="h-5 w-5 text-brand-red" />}
                  />
                </div>
              </>
            )}

            {/* Date + time */}
            <div>
              <div className="flex items-center gap-2 text-text-sub mb-3">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">
                  Pickup Date & Time
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-sub mb-1.5">
                    Date
                  </label>
                  <CustomDatePicker
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    minDate={todayLocal}
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-sub mb-1.5">
                    Time
                  </label>
                  <CustomTimePicker
                    value={scheduledTime}
                    onChange={setScheduledTime}
                  />
                </div>
              </div>
            </div>

            {/* Time classification banner */}
            <AnimatePresence mode="wait">
              {policy &&
                scheduledDate &&
                scheduledTime &&
                timeCls !== "standard" && (
                  <TimeBanner
                    key={timeCls}
                    cls={timeCls}
                    policy={policy}
                    minsAway={minsAway}
                  />
                )}
            </AnimatePresence>

            {/* Booking error */}
            {bookingErr && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {bookingErr}
              </motion.div>
            )}

            {/* Fare card */}
            <AnimatePresence mode="wait">
              {calculating && (
                <motion.div
                  key="calc"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 text-sm text-text-sub py-3"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
                  Calculating fare…
                </motion.div>
              )}
              {fareError && !calculating && (
                <motion.div
                  key="ferr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3"
                >
                  <Info className="w-4 h-4 flex-shrink-0" /> {fareError}
                </motion.div>
              )}
              {fareResult && !calculating && policy && (
                <motion.div
                  key="fare"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FareCard
                    fare={fareResult}
                    serviceType={serviceType}
                    cls={timeCls}
                    policy={policy}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Waiting policy — Distance bookings only */}
            {showWaitingPolicy && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <WaitingPolicy policy={policy!} />
              </motion.div>
            )}

            {/* Submit */}
            <NeonButton
              variant={timeCls === "immediate" ? "secondary" : "primary"}
              fullWidth
              onClick={handleBook}
              disabled={!canSubmit || isBooking}
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…
                </>
              ) : timeCls === "immediate" ? (
                <>
                  <Zap className="w-4 h-4 mr-2" /> Confirm Immediate Booking
                </>
              ) : (
                "Confirm Booking"
              )}
            </NeonButton>

            {isBlocked && policy && (
              <p className="text-xs text-red-400/80 text-center">
                Pick a time at least {policy.minAdvanceMins} min from now.
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// ─── src/pages/Booking.tsx ────────────────────────────────────────────────────
// Features:
//   F1 — Time restrictions:
//         blocked (<minAdvanceMins) | immediate (minAdvance..threshold) | standard
//         Immediate bookings get fixed fare (immediateBaseFare), not distance calc
//   F2 — Estimated trip duration from Maps shown on fare card
//   F3 — Waiting surcharge policy explained to user before submit
//   F4 — Beautiful date/time pickers from redesigned components
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Clock,
  Car,
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
            Bookings must be placed at least{" "}
            <span className="font-bold text-red-300">
              {policy.minAdvanceMins} minutes
            </span>{" "}
            before pickup. Your selected time is only{" "}
            <span className="font-bold text-red-300">
              {Math.max(0, Math.floor(minsAway))} minutes
            </span>{" "}
            away. Please choose a later slot.
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
          Because your pickup is within{" "}
          <span className="font-bold text-amber-300">
            {policy.immediateThresholdMins} minutes
          </span>
          , this is treated as an immediate booking. A flat rate of{" "}
          <span className="font-bold text-amber-300">
            LKR {policy.immediateBaseFare.toLocaleString()}
          </span>{" "}
          applies regardless of distance. Driver availability depends on
          confirmation.
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
  const displayFare = isImmediate ? policy.immediateBaseFare : fare.fare;

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
            {isImmediate ? "Immediate Booking Rate" : "Fare Estimate"}
          </p>
          <p className="text-xs text-text-sub">
            {isImmediate
              ? "Flat rate · distance not factored"
              : `${fare.fareRuleName} · shortest route`}
          </p>
        </div>
        {!isImmediate && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-green-400/10 text-green-400 border border-green-400/20 rounded-full">
            Standard
          </span>
        )}
        {isImmediate && (
          <span className="ml-auto text-xs px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full">
            Immediate
          </span>
        )}
      </div>

      {/* Stats rows */}
      <div className="space-y-3 mb-4">
        {serviceType === "Distance" && (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-text-sub text-sm">
                <Route className="w-3.5 h-3.5" /> Distance
              </div>
              <span
                className={`font-medium ${isImmediate ? "text-text-sub" : "text-white"}`}
              >
                {fare.distanceKm} km
                {isImmediate && (
                  <span className="text-xs ml-1 opacity-50">(info only)</span>
                )}
              </span>
            </div>

            {/* F2 — estimated duration */}
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

            {!isImmediate && fare.breakdown.tierUsed && (
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <TrendingUp className="w-3.5 h-3.5" /> Rate
                </div>
                <span className="text-white font-medium text-right text-sm max-w-[55%] leading-snug">
                  {fare.breakdown.tierUsed}
                </span>
              </div>
            )}
            {!isImmediate && fare.breakdown.baseCharge > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <Receipt className="w-3.5 h-3.5" /> Base charge
                </div>
                <span className="text-white font-medium">
                  LKR {fare.breakdown.baseCharge.toLocaleString()}
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

      {/* Total fare */}
      <div
        className={`rounded-xl p-4 flex items-center justify-between border
        ${isImmediate ? "bg-amber-500/8 border-amber-500/20" : "bg-brand-red/8 border-brand-red/20"}`}
      >
        <div>
          <p className="text-xs text-text-sub">Total Fare</p>
          <p className="text-xs text-text-sub/50 mt-0.5">
            *Estimate — subject to waiting charges
          </p>
        </div>
        <p
          className={`text-3xl font-bold tracking-tight
          ${isImmediate ? "text-amber-400" : "text-brand-red"}`}
        >
          LKR {displayFare.toLocaleString()}
        </p>
      </div>

      {!isImmediate && fare.fareRuleId === "fallback" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
          <AlertCircle className="w-3 h-3" /> No pricing rule set — default
          rates applied
        </div>
      )}
    </GlassCard>
  );
};

// ── Waiting policy notice ─────────────────────────────────────────────────────

const WaitingPolicy: React.FC<{ policy: BookingPolicy }> = ({ policy }) => (
  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2.5">
    <div className="flex items-center gap-2 mb-1">
      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <p className="text-sm font-semibold text-white">
        Trip Duration & Waiting Policy
      </p>
    </div>
    {[
      `Estimated travel time is calculated using Google Maps and shown in the fare card above.`,
      `The first ${policy.freeWaitingMins} minutes of delays or waiting beyond the estimated trip duration are free — no extra charge.`,
      `After the free grace period, a surcharge of LKR ${policy.waitingChargePerInterval.toLocaleString()} applies for every ${policy.waitingIntervalMins} minutes of additional waiting time.`,
      `Any applicable waiting charges are added to your final fare at the end of the trip.`,
    ].map((line, i) => (
      <div key={i} className="flex items-start gap-2">
        <span className="text-blue-400 flex-shrink-0 mt-0.5 text-xs">•</span>
        <p className="text-xs text-blue-300/80 leading-relaxed">{line}</p>
      </div>
    ))}
  </div>
);

// ── Date/Time selector with labels ────────────────────────────────────────────

const DateTimeSelector: React.FC<{
  scheduledDate: string;
  scheduledTime: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  todayLocal: string;
}> = ({
  scheduledDate,
  scheduledTime,
  onDateChange,
  onTimeChange,
  todayLocal,
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-text-sub mb-1">
      <CalendarDays className="w-4 h-4" />
      <span className="text-xs uppercase tracking-wide">
        Pickup Date & Time
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-text-sub mb-1.5">Date</label>
        <CustomDatePicker
          value={scheduledDate}
          onChange={onDateChange}
          minDate={todayLocal}
        />
      </div>
      <div>
        <label className="block text-xs text-text-sub mb-1.5">Time</label>
        <CustomTimePicker value={scheduledTime} onChange={onTimeChange} />
      </div>
    </div>
  </div>
);

// ── Service types ─────────────────────────────────────────────────────────────

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

const HOURLY_OPTS = ["1h", "2h", "3h", "4h", "6h", "12h"];
const FULLDAY_OPTS = ["4h", "6h", "8h", "10h", "12h"];

// ── Main component ────────────────────────────────────────────────────────────

export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createBooking } = useBookings();

  const [pickup, setPickup] = useState<PlaceResult | null>(null);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);

  const [serviceType, setServiceType] = useState<ServiceType>("Distance");
  const [serviceDetail, setServiceDetail] = useState("2h");
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
      .then(setPolicy)
      .catch(() => {});
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
          const address = await reverseGeocode(lat, lng);
          setPickup({
            address,
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
    const finalFare =
      bookingType === "immediate" ? policy.immediateBaseFare : fareResult!.fare;

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
  const durationOpts = serviceType === "Hourly" ? HOURLY_OPTS : FULLDAY_OPTS;

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

        {/* Service type selector */}
        <div className="grid grid-cols-3 gap-2">
          {SERVICE_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => {
                setServiceType(type);
                setFareResult(null);
              }}
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
            {/* Distance — pickup + dropoff */}
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

            {/* Hourly/Full Day — duration + start location */}
            {serviceType !== "Distance" && (
              <>
                <div>
                  <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                    Duration
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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

            {/* ── Date & Time ── */}
            <DateTimeSelector
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              onDateChange={setScheduledDate}
              onTimeChange={setScheduledTime}
              todayLocal={todayLocal}
            />

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

            {/* F4 — Waiting policy */}
            {policy && fareResult && !calculating && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <WaitingPolicy policy={policy} />
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
                Select a time at least {policy.minAdvanceMins} minutes from now
                to continue.
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

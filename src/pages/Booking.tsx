// ─── src/pages/Booking.tsx ────────────────────────────────────────────────────
// Architecture: Two completely separate fare engines.
//
//   Standard booking  → calculateDynamicFare()   (Distance rule)
//   Immediate booking → calculateImmediateFare()  (Immediate Distance rule)
//
// The booking page detects which type applies from the time classification,
// then calls the correct engine. The two FareCard renders are completely
// separate — no shared state, no conditional hacks, no Math.max.
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
  calculateImmediateFare,
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
  ImmediateFareResult,
  BookingPolicy,
} from "../types";

function fmtMins(mins: number): string {
  if (!mins || mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const TimeBanner: React.FC<{
  cls: TimeClassification;
  policy: BookingPolicy;
  minsAway: number;
}> = ({ cls, policy, minsAway }) => {
  if (cls === "standard") return null;
  if (cls === "blocked")
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
            notice. Your selected time is{" "}
            <span className="font-bold text-red-300">
              {Math.max(0, Math.floor(minsAway))} min
            </span>{" "}
            away.
          </p>
        </div>
      </motion.div>
    );
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
          . Immediate booking pricing applies — this uses a separate rate
          structure. Driver availability subject to confirmation.
        </p>
      </div>
    </motion.div>
  );
};

const StandardFareCard: React.FC<{ fare: FarePricingResult }> = ({ fare }) => (
  <GlassCard glowColor="red">
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/8">
      <div className="p-2 rounded-lg bg-brand-red/15">
        <Receipt className="w-4 h-4 text-brand-red" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Fare Estimate</p>
        <p className="text-xs text-text-sub">
          {fare.fareRuleName} · shortest route
        </p>
      </div>
      <span className="ml-auto text-xs px-2 py-0.5 rounded-full border bg-green-400/10 text-green-400 border-green-400/20">
        Standard
      </span>
    </div>
    <div className="space-y-3 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-text-sub text-sm">
          <Route className="w-3.5 h-3.5" /> Distance
        </div>
        <span className="text-white font-medium">{fare.distanceKm} km</span>
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
    </div>
    <div className="rounded-xl p-4 flex items-center justify-between border bg-brand-red/8 border-brand-red/20">
      <div>
        <p className="text-xs text-text-sub">Total Fare</p>
        <p className="text-xs text-text-sub/50 mt-0.5">
          *Subject to waiting charges
        </p>
      </div>
      <p className="text-3xl font-bold tracking-tight text-brand-red">
        LKR {fare.fare.toLocaleString()}
      </p>
    </div>
    {fare.fareRuleId === "fallback" && (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
        <AlertCircle className="w-3 h-3" /> No Distance rule configured —
        default rates applied
      </div>
    )}
  </GlassCard>
);

const ImmediateFareCard: React.FC<{ fare: ImmediateFareResult }> = ({
  fare,
}) => (
  <GlassCard glowColor="gray">
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/8">
      <div className="p-2 rounded-lg bg-amber-500/15">
        <Zap className="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">
          Immediate Booking Fare
        </p>
        <p className="text-xs text-text-sub">{fare.fareRuleName}</p>
      </div>
      <span className="ml-auto text-xs px-2 py-0.5 rounded-full border bg-amber-400/10 text-amber-400 border-amber-400/20">
        Immediate
      </span>
    </div>
    <div className="space-y-3 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-text-sub text-sm">
          <Route className="w-3.5 h-3.5" /> Distance
        </div>
        <span className="text-white font-medium">{fare.distanceKm} km</span>
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
            <TrendingUp className="w-3.5 h-3.5" /> Immediate rate
          </div>
          <span className="text-amber-300 font-medium text-right text-sm max-w-[55%] leading-snug">
            {fare.breakdown.tierUsed}
          </span>
        </div>
      )}
      {fare.breakdown.baseCharge > 0 && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-text-sub text-sm">
            <Zap className="w-3.5 h-3.5" /> Immediate base
          </div>
          <span className="text-white font-medium">
            LKR {fare.breakdown.baseCharge.toLocaleString()}
          </span>
        </div>
      )}
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
    </div>
    <div className="rounded-xl p-4 flex items-center justify-between border bg-amber-500/8 border-amber-500/20">
      <div>
        <p className="text-xs text-text-sub">Immediate Booking Fare</p>
        <p className="text-xs text-text-sub/50 mt-0.5">*Immediate rate</p>
      </div>
      <p className="text-3xl font-bold tracking-tight text-amber-400">
        LKR {fare.fare.toLocaleString()}
      </p>
    </div>
    {fare.fareRuleId === "immediate-fallback" && (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
        <AlertCircle className="w-3 h-3" /> No Immediate Distance rule
        configured — default rate applied
      </div>
    )}
  </GlassCard>
);

const FlatFareCard: React.FC<{
  fare: FarePricingResult;
  serviceType: ServiceType;
}> = ({ fare }) => (
  <GlassCard glowColor="red">
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/8">
      <div className="p-2 rounded-lg bg-brand-red/15">
        <Receipt className="w-4 h-4 text-brand-red" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Fare Estimate</p>
        <p className="text-xs text-text-sub">
          {fare.fareRuleName} · fixed package rate
        </p>
      </div>
    </div>
    <div className="space-y-3 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-text-sub text-sm">
          <Clock className="w-3.5 h-3.5" /> Duration
        </div>
        <span className="text-white font-medium">
          {fmtMins(fare.durationMins)}
        </span>
      </div>
    </div>
    <div className="rounded-xl p-4 flex items-center justify-between border bg-brand-red/8 border-brand-red/20">
      <div>
        <p className="text-xs text-text-sub">Total Fare</p>
        <p className="text-xs text-text-sub/50 mt-0.5">*Fixed package rate</p>
      </div>
      <p className="text-3xl font-bold tracking-tight text-brand-red">
        LKR {fare.fare.toLocaleString()}
      </p>
    </div>
  </GlassCard>
);

const WaitingPolicy: React.FC<{ policy: BookingPolicy }> = ({ policy }) => (
  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2.5">
    <div className="flex items-center gap-2 mb-1">
      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <p className="text-sm font-semibold text-white">
        Trip Duration & Waiting Policy
      </p>
    </div>
    {[
      "Estimated travel time is calculated using Google Maps and shown above.",
      `The first ${policy.freeWaitingMins} minutes of delays beyond the estimate are free.`,
      `After that, LKR ${policy.waitingChargePerInterval.toLocaleString()} is added for every ${policy.waitingIntervalMins} minutes.`,
      "Waiting charges are added to your final fare at the end of the trip.",
    ].map((line, i) => (
      <div key={i} className="flex items-start gap-2">
        <span className="text-blue-400 flex-shrink-0 mt-0.5 text-xs">•</span>
        <p className="text-xs text-blue-300/80 leading-relaxed">{line}</p>
      </div>
    ))}
  </div>
);

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

  // Two completely separate fare states
  const [standardFare, setStandardFare] = useState<FarePricingResult | null>(
    null,
  );
  const [immediateFare, setImmediateFare] =
    useState<ImmediateFareResult | null>(null);
  const [flatFare, setFlatFare] = useState<FarePricingResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [policy, setPolicy] = useState<BookingPolicy | null>(null);
  const [timeCls, setTimeCls] = useState<TimeClassification>("standard");
  const [minsAway, setMinsAway] = useState<number>(Infinity);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);

  useEffect(() => {
    getBookingPolicy()
      .then((p) => {
        setPolicy(p);
        if (!serviceDetail) setServiceDetail(p.hourlySlots[0] ?? "2h");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const hourlySlots = policy?.hourlySlots ?? ["2h", "3h", "4h", "5h"];
  const fullDaySlots = policy?.fullDaySlots ?? ["6h", "12h", "24h", "48h"];
  const durationOpts = serviceType === "Hourly" ? hourlySlots : fullDaySlots;

  const handleServiceTypeChange = (type: ServiceType) => {
    setServiceType(type);
    setStandardFare(null);
    setImmediateFare(null);
    setFlatFare(null);
    if (type === "Hourly") setServiceDetail((policy?.hourlySlots ?? ["2h"])[0]);
    if (type === "Full Day")
      setServiceDetail((policy?.fullDaySlots ?? ["6h"])[0]);
    if (type === "Distance") setServiceDetail("");
  };

  const recalcFare = useCallback(
    (
      p: PlaceResult | null,
      d: PlaceResult | null,
      sType: ServiceType,
      sDetail: string,
      cls: TimeClassification,
    ) => {
      clearTimeout(debounceRef.current);
      setFareError(null);
      if (sType === "Distance") {
        if (!p || !d) {
          setStandardFare(null);
          setImmediateFare(null);
          return;
        }
        setCalculating(true);
        debounceRef.current = setTimeout(async () => {
          try {
            if (cls === "immediate") {
              setImmediateFare(
                await calculateImmediateFare(p.coords, d.coords),
              );
              setStandardFare(null);
            } else {
              setStandardFare(await calculateDynamicFare(p.coords, d.coords));
              setImmediateFare(null);
            }
          } catch (e: unknown) {
            setFareError((e as Error).message ?? "Could not calculate fare.");
            setStandardFare(null);
            setImmediateFare(null);
          } finally {
            setCalculating(false);
          }
        }, 600);
      } else {
        if (!sDetail) return;
        setCalculating(true);
        debounceRef.current = setTimeout(async () => {
          try {
            setFlatFare(
              await calculateFlatFareDynamic(
                sType as "Hourly" | "Full Day",
                sDetail,
              ),
            );
          } catch (e: unknown) {
            setFareError((e as Error).message ?? "Could not load pricing.");
            setFlatFare(null);
          } finally {
            setCalculating(false);
          }
        }, 300);
      }
    },
    [],
  );

  useEffect(() => {
    recalcFare(pickup, dropoff, serviceType, serviceDetail, timeCls);
    return () => clearTimeout(debounceRef.current);
  }, [pickup, dropoff, serviceType, serviceDetail, timeCls, recalcFare]);

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
            ? "Location permission denied."
            : "Location unavailable.",
        );
      },
      { timeout: 10000, maximumAge: 30000 },
    );
  };

  const validate = (): string | null => {
    if (serviceType === "Distance" && !pickup)
      return "Please select a pickup location.";
    if (serviceType === "Distance" && !dropoff)
      return "Please select a drop-off location.";
    if (!scheduledDate || !scheduledTime)
      return "Please select a date and time.";
    if (timeCls === "blocked")
      return `Bookings need at least ${policy?.minAdvanceMins ?? 40} minutes notice.`;
    if (!standardFare && !immediateFare && !flatFare)
      return "Please wait while fare is being calculated.";
    return null;
  };

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
    const activeFare = standardFare ?? immediateFare ?? flatFare;
    if (!activeFare) return;
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
        activeFare.fare,
        activeFare.distanceKm,
        activeFare.durationMins,
        activeFare.fareRuleId,
        bookingType,
        activeFare.durationMins,
      );
      navigate("/booking-success", {
        state: { booking, userPhone: user?.phone, bookingType, policy },
      });
    } catch (e: unknown) {
      setBookingErr((e as Error).message ?? "Booking failed.");
    } finally {
      setIsBooking(false);
    }
  };

  const todayLocal = new Date().toLocaleDateString("en-CA");
  const isBlocked = timeCls === "blocked";
  const hasFare = !!(standardFare || immediateFare || flatFare);
  const canSubmit =
    !isBlocked && !calculating && hasFare && !!scheduledDate && !!scheduledTime;
  const showWaitingPolicy =
    serviceType === "Distance" &&
    timeCls === "standard" &&
    policy &&
    standardFare &&
    !calculating;

  return (
    <div className="min-h-[calc(100vh-80px)] py-10 px-4">
      <div className="max-w-xl mx-auto space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-white">Book a Driver</h1>
          <p className="text-text-sub text-sm mt-1">
            Hi {user?.name.split(" ")[0]}! Let's get your ride sorted.
          </p>
        </div>

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

            {bookingErr && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {bookingErr}
              </motion.div>
            )}

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
                  {timeCls === "immediate"
                    ? "Calculating immediate booking fare…"
                    : "Calculating fare…"}
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
              {standardFare && !calculating && (
                <motion.div
                  key="standard"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <StandardFareCard fare={standardFare} />
                </motion.div>
              )}
              {immediateFare && !calculating && (
                <motion.div
                  key="immediate"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ImmediateFareCard fare={immediateFare} />
                </motion.div>
              )}
              {flatFare && !calculating && (
                <motion.div
                  key="flat"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FlatFareCard fare={flatFare} serviceType={serviceType} />
                </motion.div>
              )}
            </AnimatePresence>

            {showWaitingPolicy && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <WaitingPolicy policy={policy!} />
              </motion.div>
            )}

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

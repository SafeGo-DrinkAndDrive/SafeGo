// ─── src/pages/Booking.tsx ────────────────────────────────────────────────────
// Fixes applied:
//   • LocationInput prop corrected: onSelect → onChange (matches LocationInputProps)
//   • CustomDatePicker prop corrected: min → minDate (matches CustomDatePickerProps)
//   • Uses fareRulesService (dynamic pricing) — no hardcoded rates
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Calendar,
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
import type {
  ServiceType,
  PlaceResult,
  CreateBookingPayload,
  FarePricingResult,
} from "../types";

// ── Fare breakdown card ───────────────────────────────────────────────────────

const FareCard: React.FC<{
  fare: FarePricingResult;
  serviceType: ServiceType;
}> = ({ fare, serviceType }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
  >
    <GlassCard glowColor="red" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/8">
        <div className="p-2 bg-brand-red/15 rounded-lg">
          <Receipt className="w-4 h-4 text-brand-red" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Fare Estimate</p>
          <p className="text-xs text-text-sub">
            {fare.fareRuleName} · Based on shortest route
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-5">
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
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-text-sub text-sm">
                <Clock className="w-3.5 h-3.5" /> Est. time
              </div>
              <span className="text-white font-medium">
                {fare.durationMins >= 60
                  ? `${Math.floor(fare.durationMins / 60)}h ${fare.durationMins % 60}m`
                  : `${fare.durationMins} min`}
              </span>
            </div>
            {fare.breakdown.tierUsed && (
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-text-sub text-sm">
                  <TrendingUp className="w-3.5 h-3.5" /> Rate
                </div>
                <span className="text-white font-medium text-right text-sm">
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
          </>
        )}
        {serviceType !== "Distance" && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-text-sub text-sm">
              <Clock className="w-3.5 h-3.5" /> Duration
            </div>
            <span className="text-white font-medium">
              {Math.floor(fare.durationMins / 60)} hours
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="bg-gradient-to-r from-brand-red/15 to-brand-red/5 border border-brand-red/25 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-sub mb-0.5">Total Fare</p>
          <p className="text-xs text-brand-red/70">*Estimate only</p>
        </div>
        <p className="text-3xl font-bold text-brand-red tracking-tight">
          LKR {fare.fare.toLocaleString()}
        </p>
      </div>

      {fare.fareRuleId !== "fallback" && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-text-sub">
          <Info className="w-3 h-3" />
          Priced using: {fare.fareRuleName}
        </div>
      )}
      {fare.fareRuleId === "fallback" && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-yellow-400">
          <AlertCircle className="w-3 h-3" />
          No pricing rule configured — using default rates
        </div>
      )}
    </GlassCard>
  </motion.div>
);

// ── Service type selector ─────────────────────────────────────────────────────

const SERVICE_TYPES: { type: ServiceType; label: string }[] = [
  { type: "Distance", label: "By Distance" },
  { type: "Hourly", label: "Hourly" },
  { type: "Full Day", label: "Full Day" },
];

const HOURLY_OPTIONS = ["1h", "2h", "3h", "4h", "6h", "12h"];
const FULLDAY_OPTIONS = ["4h", "6h", "8h", "10h", "12h"];

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

  const [isBooking, setIsBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);

  // ── Recalculate fare ──────────────────────────────────────────────────────

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
          } catch (err: unknown) {
            setFareError((err as Error).message ?? "Could not calculate fare.");
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
          } catch (err: unknown) {
            setFareError((err as Error).message ?? "Could not load pricing.");
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

  // ── Geolocation ───────────────────────────────────────────────────────────

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
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
          setLocError(
            "Could not determine your address. Please type it manually.",
          );
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocError(
          err.code === 1
            ? "Location permission denied. Please allow access or type your address."
            : "Could not get your location. Please try again.",
        );
      },
      { timeout: 10000, maximumAge: 30000 },
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!user) return;
    if (serviceType === "Distance" && (!pickup || !dropoff)) {
      setBookingErr("Please enter both pickup and drop-off locations.");
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setBookingErr("Please select a date and time.");
      return;
    }
    if (!fareResult) {
      setBookingErr("Fare has not been calculated yet. Please wait.");
      return;
    }

    setIsBooking(true);
    setBookingErr(null);

    try {
      const payload: CreateBookingPayload = {
        pickupLocation: pickup?.address ?? "N/A",
        pickupCoords: pickup?.coords ?? { lat: 0, lng: 0 },
        dropLocation: dropoff?.address ?? "N/A",
        dropCoords: dropoff?.coords ?? { lat: 0, lng: 0 },
        serviceType,
        serviceDetail: serviceType !== "Distance" ? serviceDetail : undefined,
        scheduledDate,
        scheduledTime,
      };

      const booking = await createBooking(
        payload,
        fareResult.fare,
        fareResult.distanceKm,
        fareResult.durationMins,
        fareResult.fareRuleId,
      );

      navigate("/booking-success", {
        state: {
          booking,
          userPhone: user.phone,
          fareRuleName: fareResult.fareRuleName,
        },
      });
    } catch (err: unknown) {
      setBookingErr(
        (err as Error).message ?? "Booking failed. Please try again.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  const durationOptions =
    serviceType === "Hourly" ? HOURLY_OPTIONS : FULLDAY_OPTIONS;

  // Today's date in YYYY-MM-DD (local time — fixes the UTC off-by-one bug)
  const todayLocal = new Date().toLocaleDateString("en-CA");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Book a Driver</h1>
          <p className="text-text-sub">
            Hi {user?.name.split(" ")[0]}! Fill in your booking details below.
          </p>
        </div>

        {/* Service type */}
        <div className="grid grid-cols-3 gap-3">
          {SERVICE_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => {
                setServiceType(type);
                setFareResult(null);
              }}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-all ${
                serviceType === type
                  ? "border-brand-red bg-brand-red/10 text-white"
                  : "border-white/10 text-text-sub hover:border-white/20 hover:text-white"
              }`}
            >
              <Car className="w-5 h-5" />
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
                      {/* FIX: prop is `onChange`, not `onSelect` */}
                      <LocationInput
                        placeholder="Enter pickup address"
                        value={pickup?.address ?? ""}
                        onChange={(place) => setPickup(place)}
                        icon={<MapPin className="h-5 w-5 text-brand-red" />}
                      />
                    </div>
                    <button
                      onClick={handleUseLocation}
                      disabled={locating}
                      className="px-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-text-sub hover:text-white transition-all disabled:opacity-50 flex-shrink-0"
                      title="Use my current location"
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
                  {/* FIX: prop is `onChange`, not `onSelect` */}
                  <LocationInput
                    placeholder="Enter destination"
                    value={dropoff?.address ?? ""}
                    onChange={(place) => setDropoff(place)}
                    icon={<Navigation className="h-5 w-5 text-text-sub" />}
                  />
                </div>
              </>
            )}

            {/* Duration picker for Hourly / Full Day */}
            {serviceType !== "Distance" && (
              <>
                <div>
                  <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                    Duration
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {durationOptions.map((opt) => (
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
                  {/* FIX: prop is `onChange`, not `onSelect` */}
                  <LocationInput
                    placeholder="Where should the driver meet you?"
                    value={pickup?.address ?? ""}
                    onChange={(place) => setPickup(place)}
                    icon={<MapPin className="h-5 w-5 text-brand-red" />}
                  />
                </div>
              </>
            )}

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                  Date
                </label>
                {/* FIX: prop is `minDate`, not `min` */}
                <CustomDatePicker
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  minDate={todayLocal}
                />
              </div>
              <div>
                <label className="block text-xs text-text-sub uppercase tracking-wide mb-2">
                  Time
                </label>
                <CustomTimePicker
                  value={scheduledTime}
                  onChange={setScheduledTime}
                />
              </div>
            </div>

            {/* Booking error */}
            {bookingErr && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {bookingErr}
              </div>
            )}

            {/* Fare card */}
            <AnimatePresence mode="wait">
              {calculating && (
                <motion.div
                  key="calculating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 text-sm text-text-sub py-4"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
                  Calculating fare…
                </motion.div>
              )}
              {fareError && !calculating && (
                <motion.div
                  key="fareError"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {fareError}
                </motion.div>
              )}
              {fareResult && !calculating && (
                <FareCard
                  key="fare"
                  fare={fareResult}
                  serviceType={serviceType}
                />
              )}
            </AnimatePresence>

            {/* Book button */}
            <NeonButton
              variant="primary"
              fullWidth
              onClick={handleBook}
              disabled={isBooking || calculating || !fareResult}
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…
                </>
              ) : (
                "Confirm Booking"
              )}
            </NeonButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

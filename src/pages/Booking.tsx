// ─── src/pages/Booking.tsx ────────────────────────────────────────────────────
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
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { NeonButton } from "../components/NeonButton";
import { LocationInput } from "../components/LocationInput";
import { CustomDatePicker } from "../components/CustomDatePicker";
import { CustomTimePicker } from "../components/CustomTimePicker";
import { useAuth } from "../contexts/AuthContext";
import { useBookings } from "../hooks/useBookings";
import {
  calculateFareForDistance,
  calculateFlatFare,
  reverseGeocode,
  type FareResult,
} from "../services/fareService";
import type { ServiceType, PlaceResult, CreateBookingPayload } from "../types";

// ── Fare breakdown card ───────────────────────────────────────────────────────

const FareCard: React.FC<{ fare: FareResult; serviceType: ServiceType }> = ({
  fare,
  serviceType,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
  >
    <GlassCard glowColor="red" className="overflow-hidden">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/8">
        <div className="p-2 bg-brand-red/15 rounded-lg">
          <Receipt className="w-4 h-4 text-brand-red" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Fare Estimate</p>
          <p className="text-xs text-text-sub">Based on shortest route</p>
        </div>
      </div>

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
                <Clock className="w-3.5 h-3.5" /> Est. Travel Time
              </div>
              <span className="text-white font-medium">
                {fare.durationMins >= 60
                  ? `${Math.floor(fare.durationMins / 60)}h ${fare.durationMins % 60}m`
                  : `${fare.durationMins} min`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-text-sub text-sm">
                <TrendingUp className="w-3.5 h-3.5" /> Rate
              </div>
              <span className="text-white font-medium">
                LKR {fare.breakdown.ratePerKm.toLocaleString()}/km
              </span>
            </div>
            <div className="h-px bg-white/8 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-sub">Distance Charge</span>
              <span className="text-sm text-white">
                LKR {fare.breakdown.distanceCharge.toLocaleString()}
              </span>
            </div>
          </>
        )}

        {serviceType !== "Distance" && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-text-sub text-sm">
              <Clock className="w-3.5 h-3.5" /> Duration
            </div>
            <span className="text-white font-medium">
              {fare.durationMins >= 60
                ? `${Math.floor(fare.durationMins / 60)} hours`
                : `${fare.durationMins} min`}
            </span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-brand-red/15 to-brand-red/5 border border-brand-red/25 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-sub mb-0.5">Total Fare</p>
          <p className="text-xs text-brand-red/70">*Estimate only</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-brand-red tracking-tight">
            LKR {fare.fare.toLocaleString()}
          </p>
        </div>
      </div>
    </GlassCard>
  </motion.div>
);

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

  const [fareResult, setFareResult] = useState<FareResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [fareError, setFareError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [isBooking, setIsBooking] = useState(false);
  const [bookingErr, setBookingErr] = useState<string | null>(null);

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
            const result = await calculateFareForDistance(p.coords, d.coords);
            setFareResult(result);
          } catch (err: unknown) {
            setFareError(
              err instanceof Error
                ? err.message
                : "Could not calculate distance.",
            );
            setFareResult(null);
          } finally {
            setCalculating(false);
          }
        }, 700);
      } else {
        const result = calculateFlatFare(sType, sDetail);
        setFareResult(result);
      }
    },
    [],
  );

  const handlePickup = (p: PlaceResult) => {
    setPickup(p);
    recalcFare(p, dropoff, serviceType, serviceDetail);
  };
  const handleDropoff = (d: PlaceResult) => {
    setDropoff(d);
    recalcFare(pickup, d, serviceType, serviceDetail);
  };
  const handleServiceType = (t: ServiceType) => {
    setServiceType(t);
    setFareResult(null);
    recalcFare(pickup, dropoff, t, serviceDetail);
  };
  const handleDetail = (d: string) => {
    setServiceDetail(d);
    recalcFare(pickup, dropoff, serviceType, d);
  };

  useEffect(() => {
    if (serviceType !== "Distance") {
      recalcFare(pickup, dropoff, serviceType, serviceDetail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const address = await reverseGeocode(lat, lng);
          const place: PlaceResult = {
            address,
            placeId: `geo_${lat}_${lng}`,
            coords: { lat, lng },
          };
          setPickup(place);
          recalcFare(place, dropoff, serviceType, serviceDetail);
        } catch {
          setLocError("Could not get your address. Please select manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocError(
              "Location permission denied. Please enable it in your browser settings.",
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setLocError("Location unavailable. Please select manually.");
            break;
          default:
            setLocError("Could not get your location.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const validate = (): string | null => {
    if (serviceType === "Distance" && !pickup)
      return "Please select a pickup location.";
    if (serviceType === "Distance" && !dropoff)
      return "Please select a drop-off location.";
    if (!scheduledDate) return "Please select a date.";
    if (!scheduledTime) return "Please select a time.";
    if (!fareResult) return "Please wait for fare calculation.";
    return null;
  };

  const handleBook = async () => {
    const err = validate();
    if (err) {
      setBookingErr(err);
      return;
    }

    setIsBooking(true);
    setBookingErr(null);

    const defaultCoords = { lat: 6.9271, lng: 79.8612 };

    try {
      const payload: CreateBookingPayload = {
        pickupLocation: pickup?.address ?? "N/A",
        pickupCoords: pickup?.coords ?? defaultCoords,
        dropLocation: dropoff?.address ?? "N/A",
        dropCoords: dropoff?.coords ?? defaultCoords,
        serviceType,
        serviceDetail: serviceType !== "Distance" ? serviceDetail : undefined,
        scheduledDate,
        scheduledTime,
      };

      const booking = await createBooking(
        payload,
        fareResult!.fare,
        fareResult!.distanceKm,
        fareResult!.durationMins,
      );

      navigate("/booking-success", { state: { booking } });
    } catch (err: unknown) {
      setBookingErr(
        err instanceof Error
          ? err.message
          : "Booking failed. Please try again.",
      );
      setIsBooking(false);
    }
  };

  const canBook =
    fareResult &&
    scheduledDate &&
    scheduledTime &&
    (serviceType !== "Distance" || (pickup && dropoff));

  // user is used for future features; suppress unused warning safely
  void user;

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8 relative">
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center mix-blend-screen"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Book a Ride</h1>
          <p className="text-text-sub">Your safe journey starts here</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard glowColor="red">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                <Car className="w-5 h-5 text-brand-red" /> Service Type
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(["Distance", "Hourly", "Full Day"] as ServiceType[]).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => handleServiceType(type)}
                      className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
                        serviceType === type
                          ? "bg-brand-red/20 border-brand-red text-brand-red shadow-brand"
                          : "bg-background-darker/50 border-white/10 text-text-sub hover:bg-white/5"
                      }`}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-sub uppercase tracking-wide">
                      Pickup Location
                    </label>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="flex items-center gap-1.5 text-xs text-brand-red hover:text-white border border-brand-red/40 hover:border-white/30 bg-brand-red/8 hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-60"
                    >
                      {locating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : pickup ? (
                        <LocateFixed className="w-3.5 h-3.5" />
                      ) : (
                        <Locate className="w-3.5 h-3.5" />
                      )}
                      {locating ? "Getting location…" : "Use My Location"}
                    </button>
                  </div>

                  <LocationInput
                    placeholder="Search or use button above"
                    value={pickup?.address ?? ""}
                    onChange={handlePickup}
                    icon={<MapPin className="text-brand-red" />}
                  />

                  {locError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {locError}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-text-sub uppercase tracking-wide">
                    Drop-off Location
                  </label>
                  <LocationInput
                    placeholder="Enter drop-off location"
                    value={dropoff?.address ?? ""}
                    onChange={handleDropoff}
                    icon={<Navigation className="text-brand-gray" />}
                  />
                </div>

                <AnimatePresence mode="wait">
                  {serviceType !== "Distance" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <Clock className="absolute left-4 top-3.5 h-5 w-5 text-text-sub pointer-events-none" />
                      <select
                        value={serviceDetail}
                        onChange={(e) => handleDetail(e.target.value)}
                        className="w-full bg-background-darker/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-brand-red outline-none appearance-none"
                      >
                        {serviceType === "Hourly"
                          ? ["1h", "2h", "3h", "4h", "6h", "12h"].map((h) => (
                              <option key={h} value={h}>
                                {h.replace(
                                  "h",
                                  ` Hour${parseInt(h) > 1 ? "s" : ""}`,
                                )}
                              </option>
                            ))
                          : ["4h", "6h", "8h", "10h", "12h"].map((h) => (
                              <option key={h} value={h}>
                                {h.replace("h", " Hour Package")}
                              </option>
                            ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-text-sub uppercase tracking-wide">
                      Date
                    </label>
                    <CustomDatePicker
                      value={scheduledDate}
                      onChange={setScheduledDate}
                      minDate={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-sub uppercase tracking-wide">
                      Time
                    </label>
                    <CustomTimePicker
                      value={scheduledTime}
                      onChange={setScheduledTime}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-5">
            <AnimatePresence mode="wait">
              {calculating ? (
                <motion.div
                  key="calculating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GlassCard>
                    <div className="flex items-center justify-center gap-3 py-10 text-text-sub">
                      <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                      <div>
                        <p className="text-sm text-white">Calculating fare…</p>
                        <p className="text-xs text-text-sub">
                          Getting shortest route
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : fareError ? (
                <motion.div
                  key="fareerror"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GlassCard>
                    <div className="flex items-start gap-2 text-sm text-red-400 py-4">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{fareError}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : fareResult ? (
                <FareCard
                  key="fare"
                  fare={fareResult}
                  serviceType={serviceType}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <GlassCard>
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-brand-red/50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-text-sub">
                          {serviceType === "Distance"
                            ? "Select pickup & drop-off to see fare"
                            : "Select a duration to see fare"}
                        </p>
                        <p className="text-xs text-text-sub/60 mt-1">
                          Rate: LKR 1,000/km
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {bookingErr && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {bookingErr}
              </div>
            )}

            <NeonButton
              fullWidth
              onClick={handleBook}
              disabled={!canBook || isBooking}
              className="py-4 text-base"
            >
              {isBooking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving Booking…
                </span>
              ) : fareResult ? (
                <span className="flex flex-col items-center gap-0.5">
                  <span>Confirm Booking</span>
                  <span className="text-xs opacity-75 font-normal">
                    LKR {fareResult.fare.toLocaleString()}
                  </span>
                </span>
              ) : (
                "Confirm Booking"
              )}
            </NeonButton>

            {!canBook && (
              <p className="text-xs text-text-sub text-center">
                {!fareResult
                  ? "Set locations to calculate fare first"
                  : "Pick a date and time to continue"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

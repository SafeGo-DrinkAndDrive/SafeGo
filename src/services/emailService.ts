// ─── src/services/emailService.ts ────────────────────────────────────────────
// Client-side email via EmailJS CDN. No backend required.
// Fully TypeScript-strict compliant (noUnusedLocals, noUnusedParameters).
//
// Setup — add these to Vercel environment variables:
//   VITE_EMAILJS_PUBLIC_KEY
//   VITE_EMAILJS_SERVICE_ID
//   VITE_EMAILJS_BOOKING_TEMPLATE_ID    (new booking → user + admin)
//   VITE_EMAILJS_COMPLETION_TEMPLATE_ID (ride complete → user)
//   VITE_ADMIN_EMAIL
//
// Template variables — booking:
//   to_email, to_name, booking_id, user_name, user_phone,
//   pickup, dropoff, service_type, booking_type,
//   scheduled_date, scheduled_time, fare, distance
//
// Template variables — completion:
//   to_email, to_name, booking_id, pickup, dropoff,
//   scheduled_date, scheduled_time, estimated_fare,
//   actual_duration, waiting_surcharge, final_fare, has_surcharge
// ─────────────────────────────────────────────────────────────────────────────

import type { Booking } from '../types';

// ── EmailJS type (matches CDN global) ────────────────────────────────────────

interface EmailJSInstance {
  init: (publicKey: string) => void;
  send: (
    serviceId:  string,
    templateId: string,
    params:     Record<string, string>,
  ) => Promise<{ status: number; text: string }>;
}

function getEJS(): EmailJSInstance | null {
  return (window as unknown as { emailjs?: EmailJSInstance }).emailjs ?? null;
}

// ── Lazy CDN loader ───────────────────────────────────────────────────────────

let _loaded  = false;
let _loading = false;
const _queue: Array<() => void> = [];

function loadEmailJS(): Promise<void> {
  return new Promise((resolve) => {
    if (_loaded) { resolve(); return; }
    _queue.push(resolve);
    if (_loading) return;
    _loading = true;

    const script  = document.createElement('script');
    script.src    = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async  = true;

    const flush = () => {
      _loaded = true;
      const key = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
      const ejs = getEJS();
      if (key && ejs) ejs.init(key);
      _queue.splice(0).forEach((cb) => cb());
    };

    const fail = () => {
      _loading = false;
      _queue.splice(0).forEach((cb) => cb()); // resolve so callers don't hang
    };

    script.addEventListener('load',  flush);
    script.addEventListener('error', fail);
    document.head.appendChild(script);
  });
}

// ── Config ────────────────────────────────────────────────────────────────────

const SERVICE_ID            = import.meta.env.VITE_EMAILJS_SERVICE_ID               as string ?? '';
const BOOKING_TEMPLATE_ID   = import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE_ID      as string ?? '';
const COMPLETION_TEMPLATE_ID= import.meta.env.VITE_EMAILJS_COMPLETION_TEMPLATE_ID   as string ?? '';
const ADMIN_EMAIL           = import.meta.env.VITE_ADMIN_EMAIL                      as string ?? '';

function configured(): boolean {
  return !!(
    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) &&
    SERVICE_ID &&
    BOOKING_TEMPLATE_ID
  );
}

// ── Core sender ───────────────────────────────────────────────────────────────

async function send(templateId: string, params: Record<string, string>): Promise<void> {
  if (!configured()) return; // silently skip — env vars not set
  await loadEmailJS();
  const ejs = getEJS();
  if (!ejs) return;
  try {
    await ejs.send(SERVICE_ID, templateId, params);
  } catch (err) {
    console.error('[EmailJS] Send failed:', err);
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `LKR ${n.toLocaleString()}`;
}

function fmtMins(mins: number | undefined): string {
  if (!mins || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const m = mins % 60;
  return m ? `${Math.floor(mins / 60)}h ${m}m` : `${Math.floor(mins / 60)}h`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sends booking confirmation to the user AND the admin.
 * Called right after firestoreCreateBooking — fire-and-forget.
 */
export async function sendBookingConfirmationEmails(
  booking:   Booking,
  userEmail: string,
): Promise<void> {
  const base: Record<string, string> = {
    booking_id:     booking.id.slice(0, 12).toUpperCase(),
    user_name:      booking.userName,
    user_phone:     booking.userPhone,
    pickup:         booking.pickupLocation,
    dropoff:        booking.dropLocation,
    service_type:   booking.serviceType + (booking.serviceDetail ? ` · ${booking.serviceDetail}` : ''),
    booking_type:   booking.bookingType === 'immediate' ? 'Immediate Booking' : 'Standard Booking',
    scheduled_date: booking.scheduledDate,
    scheduled_time: booking.scheduledTime,
    fare:           fmt(booking.fare),
    distance:       booking.distance > 0 ? `${booking.distance} km` : '—',
  };

  // To user
  await send(BOOKING_TEMPLATE_ID, { ...base, to_email: userEmail,   to_name: booking.userName   });
  // To admin
  if (ADMIN_EMAIL) {
    await send(BOOKING_TEMPLATE_ID, { ...base, to_email: ADMIN_EMAIL, to_name: 'SafeGo Admin' });
  }
}

/**
 * Sends ride completion email to the user with final fare breakdown.
 * Called after the completion transaction commits — fire-and-forget.
 */
export async function sendRideCompletionEmail(
  booking:   Booking,
  userEmail: string,
): Promise<void> {
  if (!COMPLETION_TEMPLATE_ID) return;

  const surcharge    = booking.waitingSurcharge ?? 0;
  const finalFare    = booking.finalFare ?? booking.fare;
  const hasSurcharge = surcharge > 0;

  await send(COMPLETION_TEMPLATE_ID, {
    to_email:          userEmail,
    to_name:           booking.userName,
    booking_id:        booking.id.slice(0, 12).toUpperCase(),
    pickup:            booking.pickupLocation,
    dropoff:           booking.dropLocation,
    scheduled_date:    booking.scheduledDate,
    scheduled_time:    booking.scheduledTime,
    estimated_fare:    fmt(booking.fare),
    actual_duration:   fmtMins(booking.actualDurationMins),
    waiting_surcharge: hasSurcharge ? fmt(surcharge) : 'None',
    final_fare:        fmt(finalFare),
    has_surcharge:     hasSurcharge ? 'yes' : 'no',
  });
}
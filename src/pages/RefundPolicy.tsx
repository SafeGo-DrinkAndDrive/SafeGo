// ─── src/pages/RefundPolicy.tsx ──────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
    <div className="text-text-sub text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

const Row: React.FC<{ scenario: string; outcome: string; color?: string }> = ({
  scenario, outcome, color = 'text-green-400',
}) => (
  <div className="grid grid-cols-2 gap-4 py-3 border-b border-white/5 last:border-0">
    <span className="text-text-sub">{scenario}</span>
    <span className={`font-medium ${color}`}>{outcome}</span>
  </div>
);

export const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-red/15 rounded-xl">
              <RotateCcw className="w-6 h-6 text-brand-red" />
            </div>
            <h1 className="text-3xl font-bold text-white">Refund Policy</h1>
          </div>
          <p className="text-text-sub text-sm mb-8">Last updated: June 2025 &nbsp;·&nbsp; SafeGo, Sri Lanka</p>

          <div className="bg-white/3 border border-white/8 rounded-2xl px-8 py-8">

            <Section title="1. Overview">
              <p>SafeGo operates as a driver-booking service. Because our service involves allocating a driver's time, refund eligibility depends on when a cancellation is made relative to the scheduled pickup time. This policy is designed to be fair to both customers and drivers.</p>
              <p>All refund decisions are made in accordance with the Consumer Affairs Authority Act of Sri Lanka and applicable consumer protection regulations.</p>
            </Section>

            <Section title="2. Cancellation and Refund Schedule">
              <div className="bg-black/20 rounded-xl p-4 mt-2">
                <div className="grid grid-cols-2 gap-4 pb-2 mb-1 border-b border-white/10">
                  <span className="text-xs text-text-sub uppercase tracking-wide">Cancellation Timing</span>
                  <span className="text-xs text-text-sub uppercase tracking-wide">Refund Outcome</span>
                </div>
                <Row scenario="More than 24 hours before pickup" outcome="Full refund" color="text-green-400" />
                <Row scenario="6–24 hours before pickup" outcome="Full refund" color="text-green-400" />
                <Row scenario="2–6 hours before pickup" outcome="50% refund" color="text-yellow-400" />
                <Row scenario="Less than 2 hours before pickup" outcome="No refund" color="text-red-400" />
                <Row scenario="After driver has departed to pickup" outcome="No refund" color="text-red-400" />
                <Row scenario="Immediate booking (within 90 min window)" outcome="No refund once confirmed" color="text-red-400" />
              </div>
              <p className="text-xs text-text-sub/70 mt-2">* Timing is calculated from the moment the cancellation request is received by SafeGo, not from when the booking was placed.</p>
            </Section>

            <Section title="3. Refunds Due to SafeGo Cancellations">
              <p>If SafeGo cancels your booking for any reason (including inability to assign a driver, system error, or service unavailability), you are entitled to a <span className="text-white font-medium">full refund</span> regardless of timing. We will notify you as soon as possible and process the refund within 7 working days.</p>
            </Section>

            <Section title="4. Driver No-Show">
              <p>If a confirmed driver fails to arrive within a reasonable time (30 minutes beyond the scheduled pickup time) and you have not been notified of a delay, you are entitled to a full refund. Please contact us via WhatsApp or phone to report a no-show before arranging alternative transport.</p>
            </Section>

            <Section title="5. Waiting Surcharges">
              <p>Waiting surcharges are applied at the end of a trip based on actual trip duration compared to the Google Maps estimate. These charges are non-refundable once a trip has been completed and confirmed, as they represent additional driver time actually incurred.</p>
              <p>If you believe a waiting surcharge has been applied in error, please contact us within <span className="text-white">48 hours</span> of trip completion with your booking ID. We will review the trip data and respond within 3 working days.</p>
            </Section>

            <Section title="6. How Refunds Are Processed">
              <p>SafeGo currently operates on a cash/direct payment basis for most bookings. Refunds for advance payments (if applicable) will be processed via:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Bank transfer to the account used for payment</li>
                <li>Mobile money transfer (where applicable)</li>
              </ul>
              <p>Refunds will be processed within <span className="text-white">7 working days</span> of the approved refund request. SafeGo does not charge any processing fees for refunds.</p>
            </Section>

            <Section title="7. Dispute Resolution">
              <p>If you are dissatisfied with a refund decision, you may escalate your complaint by contacting us at <span className="text-brand-red">hello@safego.lk</span> with your booking ID and a description of your concern. We aim to resolve all disputes within 5 working days.</p>
              <p>If a resolution cannot be reached, you may refer the matter to the Consumer Affairs Authority of Sri Lanka (CAA) or seek redress through the Small Claims Court.</p>
            </Section>

            <Section title="8. Exceptional Circumstances">
              <p>In cases of genuine emergencies (medical, natural disaster, or other extraordinary events), SafeGo will consider refund requests on a case-by-case basis regardless of the cancellation timing, at our sole discretion. Please contact us with supporting information.</p>
            </Section>

            <Section title="9. Contact for Refund Requests">
              <p>To request a refund or raise a billing dispute, please contact us with your booking ID:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Email: <span className="text-brand-red">hello@safego.lk</span></li>
                <li>WhatsApp / Phone: <span className="text-white">+94 77 000 0000</span></li>
              </ul>
              <p>Please include your booking ID, the reason for your refund request, and any supporting details. Refund requests without a booking ID cannot be processed.</p>
            </Section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

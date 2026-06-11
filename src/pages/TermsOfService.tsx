// ─── src/pages/TermsOfService.tsx ────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
    <div className="text-text-sub text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-red/15 rounded-xl">
              <FileText className="w-6 h-6 text-brand-red" />
            </div>
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>
          <p className="text-text-sub text-sm mb-8">Last updated: June 2025 &nbsp;·&nbsp; SafeGo, Sri Lanka</p>

          <div className="bg-white/3 border border-white/8 rounded-2xl px-8 py-8">

            <Section title="1. Acceptance of Terms">
              <p>By accessing or using the SafeGo platform (website and mobile interface at safego.lk), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.</p>
              <p>These terms are governed by the laws of Sri Lanka, including the Consumer Affairs Authority Act, the Electronic Transactions Act No. 19 of 2006, and other applicable Sri Lankan legislation.</p>
            </Section>

            <Section title="2. Description of Service">
              <p>SafeGo is a driver-booking platform that connects vehicle owners with professional drivers. Our service allows users to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Book a driver to operate their own vehicle</li>
                <li>Schedule trips by distance, hourly, or full-day packages</li>
                <li>Receive fare estimates based on distance and duration</li>
                <li>Communicate booking details via WhatsApp</li>
              </ul>
              <p>SafeGo is not a taxi or ride-hailing service. Drivers operate the customer's own vehicle. SafeGo does not own, lease, or operate any vehicles.</p>
            </Section>

            <Section title="3. User Eligibility">
              <p>To use SafeGo, you must:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Be at least 18 years of age</li>
                <li>Hold a valid vehicle with current registration and insurance</li>
                <li>Provide accurate personal and vehicle information</li>
                <li>Have a valid Sri Lankan mobile number</li>
                <li>Not be suspended or banned from the SafeGo platform</li>
              </ul>
            </Section>

            <Section title="4. Bookings and Confirmation">
              <p>All bookings made through SafeGo are subject to driver availability. A booking is not confirmed until you receive explicit confirmation from our team via WhatsApp or phone. The estimated fare shown at the time of booking is an approximation and may be subject to adjustment based on actual trip duration and any applicable waiting surcharges.</p>
              <p>For <span className="text-white">immediate bookings</span> (trips scheduled within 90 minutes), availability cannot be guaranteed and the booking is subject to driver confirmation.</p>
            </Section>

            <Section title="5. Fares and Payments">
              <p>Fares are calculated based on:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Distance travelled (for distance-based bookings)</li>
                <li>Package duration (for hourly and full-day bookings)</li>
                <li>Waiting surcharges where actual trip time exceeds the estimated duration</li>
              </ul>
              <p>A waiting surcharge of <span className="text-white">LKR 300 per 15 minutes</span> applies after a free grace period of 15 minutes, for distance-based bookings only. All fares are quoted in Sri Lankan Rupees (LKR). Prices include all applicable taxes. SafeGo reserves the right to adjust fare structures with reasonable notice.</p>
            </Section>

            <Section title="6. Cancellations">
              <p>Cancellations may be made by the customer within a reasonable timeframe before the scheduled pickup. Please refer to our Refund Policy for details on refunds applicable to cancellations. Repeated last-minute cancellations may result in account restrictions.</p>
            </Section>

            <Section title="7. User Conduct">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Provide false or misleading information during registration or booking</li>
                <li>Use the platform for any unlawful purpose under Sri Lankan law</li>
                <li>Harass, threaten, or abuse SafeGo staff or drivers</li>
                <li>Attempt to circumvent or manipulate the fare calculation system</li>
                <li>Create multiple accounts to avoid account restrictions</li>
                <li>Use the platform while under the influence of alcohol or drugs in a manner that endangers others</li>
              </ul>
            </Section>

            <Section title="8. Driver Conduct and Liability">
              <p>SafeGo drivers are independent service providers and not employees of SafeGo. SafeGo exercises reasonable care in verifying driver credentials but does not guarantee the conduct of drivers. In the event of a complaint regarding driver behaviour, please contact us immediately at <span className="text-brand-red">hello@safego.lk</span>.</p>
              <p>SafeGo shall not be liable for any loss, damage, or injury arising from the actions of a driver, or from circumstances beyond our reasonable control.</p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>To the maximum extent permitted by Sri Lankan law, SafeGo's liability in respect of any claim arising from use of the platform shall be limited to the fare paid for the specific booking in question. SafeGo shall not be liable for any indirect, consequential, or special damages.</p>
            </Section>

            <Section title="10. Intellectual Property">
              <p>All content on the SafeGo platform, including the brand name, logo, software, and written content, is the intellectual property of SafeGo and is protected under the Intellectual Property Act No. 36 of 2003 of Sri Lanka. You may not reproduce, distribute, or create derivative works without our prior written consent.</p>
            </Section>

            <Section title="11. Termination">
              <p>SafeGo reserves the right to suspend or terminate your account at any time, with or without notice, if you violate these Terms of Service or engage in conduct that is harmful to other users, drivers, or the platform. You may close your account at any time by contacting us.</p>
            </Section>

            <Section title="12. Governing Law and Disputes">
              <p>These Terms of Service are governed by and construed in accordance with the laws of Sri Lanka. Any disputes arising from these terms shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.</p>
            </Section>

            <Section title="13. Changes to These Terms">
              <p>We may modify these Terms of Service at any time. Continued use of the platform after changes take effect constitutes your acceptance of the revised terms. We will provide reasonable notice of material changes via email or platform notification.</p>
            </Section>

            <Section title="14. Contact">
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Email: <span className="text-brand-red">hello@safego.lk</span></li>
                <li>Phone: <span className="text-white">+94 77 000 0000</span></li>
              </ul>
            </Section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

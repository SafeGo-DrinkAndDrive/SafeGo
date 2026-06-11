// ─── src/pages/PrivacyPolicy.tsx ─────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
    <div className="text-text-sub text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-red/15 rounded-xl">
              <Shield className="w-6 h-6 text-brand-red" />
            </div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-text-sub text-sm mb-8">Last updated: June 2025 &nbsp;·&nbsp; SafeGo, Sri Lanka</p>

          <div className="bg-white/3 border border-white/8 rounded-2xl px-8 py-8">

            <Section title="1. Introduction">
              <p>SafeGo ("we", "us", or "our") is a driver-booking platform operated in Sri Lanka. We are committed to protecting your personal information in accordance with the Personal Data Protection Act No. 9 of 2022 of Sri Lanka and applicable data protection principles.</p>
              <p>By using SafeGo, you agree to the collection and use of information as described in this policy.</p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following categories of personal information when you register and use our service:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="text-white">Account information:</span> Full name, email address, mobile number</li>
                <li><span className="text-white">Vehicle information:</span> Vehicle make, model, registration plate, insurance and licence details</li>
                <li><span className="text-white">Booking information:</span> Pickup and drop-off locations, scheduled date and time, service type</li>
                <li><span className="text-white">Location data:</span> GPS coordinates at the time of booking (with your permission)</li>
                <li><span className="text-white">Payment information:</span> Fare amounts (we do not store card or bank details)</li>
                <li><span className="text-white">Usage data:</span> Browser type, device type, pages visited, timestamps</li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use your information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>To process and manage your ride bookings</li>
                <li>To contact you regarding your bookings via WhatsApp or phone</li>
                <li>To send service-related notifications and confirmations</li>
                <li>To calculate fares, surcharges, and generate invoices</li>
                <li>To improve and maintain our platform</li>
                <li>To comply with legal obligations under Sri Lankan law</li>
                <li>To prevent fraud and ensure platform security</li>
              </ul>
            </Section>

            <Section title="4. Sharing of Information">
              <p>We do not sell, rent, or trade your personal information to third parties. We may share your information with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><span className="text-white">Assigned drivers:</span> Your name, phone number, pickup/drop location for trip fulfilment</li>
                <li><span className="text-white">Service providers:</span> Google (Maps API), Firebase (database and authentication) — subject to their own privacy policies</li>
                <li><span className="text-white">Legal authorities:</span> When required by Sri Lankan law or court order</li>
              </ul>
              <p>All third-party service providers we use are required to handle your data securely and only for the purposes we specify.</p>
            </Section>

            <Section title="5. Data Retention">
              <p>We retain your personal data for as long as your account is active or as necessary to provide our services. Booking records are retained for a minimum of 3 years for accounting and legal compliance purposes. You may request deletion of your account at any time by contacting us.</p>
            </Section>

            <Section title="6. Your Rights">
              <p>Under the Personal Data Protection Act (Sri Lanka), you have the following rights:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Right to access your personal data</li>
                <li>Right to correct inaccurate or incomplete data</li>
                <li>Right to request deletion of your data (subject to legal retention requirements)</li>
                <li>Right to object to processing of your data</li>
                <li>Right to withdraw consent at any time</li>
              </ul>
              <p>To exercise any of these rights, please contact us at <span className="text-brand-red">hello@safego.lk</span>.</p>
            </Section>

            <Section title="7. Cookies and Tracking">
              <p>Our platform uses cookies and similar technologies to maintain your login session and improve your experience. We do not use advertising or tracking cookies. You may disable cookies in your browser settings, but this may affect your ability to log in or use the platform.</p>
            </Section>

            <Section title="8. Data Security">
              <p>We implement industry-standard security measures including Firebase Authentication, encrypted data transmission (HTTPS), and role-based access controls. However, no system is completely secure. We encourage you to keep your account credentials confidential.</p>
            </Section>

            <Section title="9. Children's Privacy">
              <p>SafeGo is not intended for use by persons under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has registered on our platform, please contact us immediately.</p>
            </Section>

            <Section title="10. Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice on our platform. Continued use of SafeGo after changes constitutes acceptance of the updated policy.</p>
            </Section>

            <Section title="11. Contact Us">
              <p>For any privacy-related queries or to exercise your rights:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Email: <span className="text-brand-red">hello@safego.lk</span></li>
                <li>Phone: <span className="text-white">+94 77 000 0000</span></li>
                <li>Address: SafeGo, Sri Lanka</li>
              </ul>
            </Section>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

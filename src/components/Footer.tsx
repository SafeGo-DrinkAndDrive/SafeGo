import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle, Mail, Phone } from 'lucide-react';
const linkHoverClass =
'text-text-sub hover:text-brand-red transition-colors duration-300 text-sm';
export const Footer: React.FC = () => {
  return (
    <footer className="relative border-t border-white/5">
      {/* Gradient divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-red/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Column 1 — Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <img
                src="/logo.jpg"
                alt="SafeGo Logo"
                className="h-14 w-auto rounded-lg object-contain" />
              
            </Link>
            <p className="text-text-sub text-sm leading-relaxed max-w-xs">
              Safe rides home, anytime. Professional chauffeur service for you
              and your vehicle across Sri Lanka.
            </p>
          </div>

          {/* Column 2 — Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
              {
                label: 'Home',
                to: '/'
              },
              {
                label: 'Book a Ride',
                to: '/booking'
              },
              {
                label: 'Register',
                to: '/register'
              },
              {
                label: 'Login',
                to: '/login'
              }].
              map((link) =>
              <li key={link.label}>
                  <Link to={link.to} className={linkHoverClass}>
                    {link.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3 — Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Legal
            </h4>
            <ul className="space-y-3">
              {['Privacy Policy', 'Terms of Service', 'Refund Policy'].map(
                (item) =>
                <li key={item}>
                    <button className={linkHoverClass}>{item}</button>
                  </li>

              )}
            </ul>
          </div>

          {/* Column 4 — Contact & Social */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@safego.lk"
                  className={`${linkHoverClass} flex items-center gap-2`}>
                  
                  <Mail className="w-4 h-4" />
                  hello@safego.lk
                </a>
              </li>
              <li>
                <a
                  href="tel:+94770000000"
                  className={`${linkHoverClass} flex items-center gap-2`}>
                  
                  <Phone className="w-4 h-4" />
                  +94 77 000 0000
                </a>
              </li>
            </ul>

            {/* Social icons */}
            <div className="flex items-center gap-3 pt-2">
              {[
              {
                icon: Facebook,
                href: '#',
                label: 'Facebook'
              },
              {
                icon: Instagram,
                href: '#',
                label: 'Instagram'
              },
              {
                icon: MessageCircle,
                href: 'https://wa.me/94770000000',
                label: 'WhatsApp'
              }].
              map((social) =>
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                whileHover={{
                  scale: 1.15,
                  y: -2
                }}
                whileTap={{
                  scale: 0.95
                }}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-sub hover:text-brand-red hover:border-brand-red/40 hover:shadow-brand transition-all duration-300">
                
                  <social.icon className="w-4 h-4" />
                </motion.a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-14 pt-6 border-t border-white/5 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <p className="text-center text-xs text-text-sub">
            © 2026 SafeGo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>);

};
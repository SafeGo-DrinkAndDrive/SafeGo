import React from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

export const WhatsAppButton: React.FC = () => {
  const phoneNumber = "94742396271";
  const message = encodeURIComponent("Hi SAFEGO, I need a driver");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-600 rounded-full shadow-subtle hover:shadow-brand transition-shadow duration-300"
    >
      <MessageCircle className="w-8 h-8 text-white" />
    </motion.a>
  );
};

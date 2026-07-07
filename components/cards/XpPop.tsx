"use client";

import { motion, AnimatePresence } from "framer-motion";

export function XpPop({ amount, bonus }: { amount: number | null; bonus?: boolean }) {
  return (
    <AnimatePresence>
      {amount !== null && (
        <motion.div
          key={amount}
          initial={{ opacity: 0, y: 10, scale: 0.6 }}
          animate={{ opacity: 1, y: -30, scale: bonus ? 1.4 : 1 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 font-display text-4xl text-(--accent) drop-shadow-[3px_3px_0_#000]"
        >
          +{amount} XP{bonus ? " ×2!" : ""}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client"

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const lines = [
  "The first page smelled like rain and ozone.",
  "By morning, the town had forgotten how to go forward.",
  "She left a note that only appeared in the margins.",
  "We found the map folded inside a song.",
  "Every clock in the house struck thirteen, softly.",
];

const OpeningLines = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % lines.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="border-t border-[var(--border)] py-6 my-6">
      <p className="text-micro uppercase tracking-[0.2em] text-[var(--text-faint)] mb-2">Opening line</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-base md:text-lg text-[var(--text-muted)] italic leading-relaxed"
        >
          &ldquo;{lines[index]}&rdquo;
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default OpeningLines;
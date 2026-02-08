"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const lines = [
  "The first page smelled like rain and ozone.",
  "By morning, the town had forgotten how to go forward.",
  "She left a note that only appeared in the margins.",
  "We found the map folded inside a song.",
  "Every clock in the house struck thirteen, softly.",
]

const OpeningLines = () => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % lines.length)
    }, 3200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-3xl px-5 md:px-6 py-4 md:py-5 border border-[#d7d0c7] bg-transparent">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#b6ff4b]/30 blur-2xl"></div>
      <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-[#ff8a5c]/20 blur-2xl"></div>
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-[#8f7f74]">Opening line</div>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45 }}
          className="mt-3 text-base md:text-xl ink-title"
        >
          {lines[index]}
        </motion.p>
      </AnimatePresence>
      <div className="mt-3 h-[2px] w-16 bg-[#1b1a17]"></div>
    </div>
  )
}

export default OpeningLines

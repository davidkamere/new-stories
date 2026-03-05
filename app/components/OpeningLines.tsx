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
    <div className="relative overflow-hidden rounded-md px-5 md:px-6 py-5 md:py-6 border border-[#c6c6c3] bg-[#f5f5f3]">
      <div className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-[#5f5f5a] font-medium">Opening line</div>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="mt-3 text-lg md:text-2xl ink-title text-[#101010]"
        >
          {lines[index]}
        </motion.p>
      </AnimatePresence>
      <div className="mt-5 h-[1px] w-full bg-[#c6c6c3]"></div>
    </div>
  )
}

export default OpeningLines

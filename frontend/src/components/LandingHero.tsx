/**
 * LandingHero — title, subtitle, rotating quote carousel, particle background,
 * and Start/Stop Camera button.
 * Requirements: 1.1, 7.1, 7.2, 7.3, 8.3
 */

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LandingHeroProps {
  cameraActive: boolean
  onStart: () => void
  onStop: () => void
}

// ---------------------------------------------------------------------------
// Beauty-themed quotes for the carousel
// ---------------------------------------------------------------------------
const QUOTES = [
  'Beauty begins the moment you decide to be yourself.',
  'Confidence is the best makeup.',
  'Your smile is your logo, your personality is your business card.',
  'Elegance is not about being noticed, it\'s about being remembered.',
]

// ---------------------------------------------------------------------------
// Particle configuration
// ---------------------------------------------------------------------------
interface Particle {
  id: number
  x: number   // % from left
  y: number   // % from top
  size: number
  duration: number
  delay: number
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3,
    duration: Math.random() * 6 + 5,
    delay: Math.random() * 4,
  }))
}

const PARTICLES = generateParticles(20)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LandingHero({ cameraActive, onStart, onStop }: LandingHeroProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rotate quotes every 4 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length)
    }, 4000)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const handleButtonClick = () => {
    if (cameraActive) {
      onStop()
    } else {
      onStart()
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center text-center px-6 py-12 overflow-hidden">
      {/* Animated particle background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-pink-300/30"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Title */}
      <motion.h1
        className="relative z-10 text-4xl md:text-5xl font-bold text-white tracking-tight"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Beauty Insight Studio
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="relative z-10 mt-3 text-lg text-pink-200/80 font-light"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
      >
        Your face tells a story — we reveal it
      </motion.p>

      {/* Quote carousel */}
      <div className="relative z-10 mt-8 h-12 flex items-center justify-center w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIndex}
            className="absolute text-sm text-white/60 italic px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            "{QUOTES[quoteIndex]}"
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Start / Stop Camera button */}
      <motion.button
        className="relative z-10 mt-10 px-8 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg shadow-pink-500/30 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-transparent"
        onClick={handleButtonClick}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        aria-label={cameraActive ? 'Stop Camera' : 'Start Camera'}
      >
        {cameraActive ? 'Stop Camera' : 'Start Camera'}
      </motion.button>
    </div>
  )
}

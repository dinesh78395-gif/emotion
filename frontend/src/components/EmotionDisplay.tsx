/**
 * EmotionDisplay — shows current emotion label, confidence %, and accent glow.
 * Requirements: 2.6, 2.7, 8.1
 */

import { AnimatePresence, motion } from 'framer-motion'
import type { DetectionResult } from '../types'
import { getAccentColor } from '../utils/emotionUtils'

interface EmotionDisplayProps {
  result: DetectionResult | null
  noFaceDetected: boolean
}

/** Maps accent color names to Tailwind shadow/glow utility classes. */
const GLOW_CLASSES: Record<string, string> = {
  yellow: 'shadow-yellow-400/60',
  blue: 'shadow-blue-400/60',
  red: 'shadow-red-400/60',
  orange: 'shadow-orange-400/60',
  lavender: 'shadow-purple-300/60',
  purple: 'shadow-purple-500/60',
  green: 'shadow-green-400/60',
}

/** Maps accent color names to Tailwind text color classes. */
const TEXT_CLASSES: Record<string, string> = {
  yellow: 'text-yellow-300',
  blue: 'text-blue-300',
  red: 'text-red-300',
  orange: 'text-orange-300',
  lavender: 'text-purple-300',
  purple: 'text-purple-400',
  green: 'text-green-300',
}

export function EmotionDisplay({ result, noFaceDetected }: EmotionDisplayProps) {
  const accentColor = result ? getAccentColor(result.emotion) : null
  const glowClass = accentColor ? GLOW_CLASSES[accentColor] ?? '' : ''
  const textClass = accentColor ? TEXT_CLASSES[accentColor] ?? 'text-white' : 'text-white'

  return (
    <div className="flex flex-col items-center gap-2">
      <AnimatePresence mode="wait">
        {noFaceDetected && !result && (
          <motion.p
            key="no-face"
            className="text-white/60 text-sm italic"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            No face detected
          </motion.p>
        )}

        {result && (
          <motion.div
            key={result.emotion}
            className={`rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-8 py-5 shadow-lg ${glowClass}`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Emotion label */}
            <p
              className={`text-2xl font-semibold capitalize tracking-wide ${textClass}`}
              aria-label={`Current emotion: ${result.emotion}`}
            >
              {result.emotion}
            </p>

            {/* Confidence percentage */}
            <p className="mt-1 text-center text-sm text-white/70">
              {Math.round(result.confidence * 100)}% confidence
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

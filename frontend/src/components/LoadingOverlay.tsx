/**
 * LoadingOverlay — shown while face-api.js models are loading.
 * Requirements: 3.2
 */

import { motion } from 'framer-motion'

interface LoadingOverlayProps {
  modelStatus: 'idle' | 'loading' | 'ready' | 'error'
}

export function LoadingOverlay({ modelStatus }: LoadingOverlayProps) {
  if (modelStatus !== 'loading') return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Animated spinner */}
      <motion.div
        className="w-16 h-16 rounded-full border-4 border-pink-300/30 border-t-pink-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />

      {/* Status label */}
      <motion.p
        className="mt-6 text-pink-100 text-sm font-medium tracking-wide"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Loading face detection models…
      </motion.p>
    </div>
  )
}

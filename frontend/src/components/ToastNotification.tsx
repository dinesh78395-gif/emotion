/**
 * ToastNotification — non-blocking overlay toast that auto-dismisses after 4 s.
 * Requirements: 11.2
 */

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ToastNotificationProps {
  message: string | null
  onDismiss: () => void
}

export function ToastNotification({ message, onDismiss }: ToastNotificationProps) {
  // Auto-dismiss after 4 seconds whenever a new message appears
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          role="alert"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-5 py-4 shadow-lg"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-start gap-3">
            {/* Warning icon */}
            <span className="mt-0.5 text-yellow-400 text-lg leading-none" aria-hidden="true">
              ⚠
            </span>

            <p className="flex-1 text-sm text-white/90 leading-snug">{message}</p>

            {/* Manual dismiss button */}
            <button
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="ml-2 text-white/50 hover:text-white/90 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

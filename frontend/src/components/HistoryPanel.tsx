/**
 * HistoryPanel — scrollable list of EmotionLog entries (capped at 100, newest first).
 * Requirements: 5.1, 5.2, 5.3, 5.4, 11.3
 */

import { AnimatePresence, motion } from 'framer-motion'
import type { EmotionLog } from '../types'

interface HistoryPanelProps {
  logs: EmotionLog[]
  logsError: string | null
  onRetry: () => void
}

/** Format an ISO 8601 timestamp into a human-readable string. */
function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

export function HistoryPanel({ logs, logsError, onRetry }: HistoryPanelProps) {
  // Cap at 100 entries, newest first (caller should already sort, but guard here too)
  const displayLogs = logs.slice(0, 100)

  return (
    <div
      className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 flex flex-col gap-3"
      aria-label="Emotion history"
    >
      <h2 className="text-white font-semibold text-lg tracking-wide">History</h2>

      {/* Inline error state */}
      {logsError && (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3">
          <p className="text-red-300 text-sm">{logsError}</p>
          <button
            onClick={onRetry}
            className="text-xs font-medium text-white bg-red-500/40 hover:bg-red-500/60 transition-colors rounded-lg px-3 py-1"
          >
            Retry
          </button>
        </div>
      )}

      {/* Scrollable log list */}
      <div className="overflow-y-auto max-h-80 flex flex-col gap-2 pr-1">
        <AnimatePresence initial={false}>
          {displayLogs.length === 0 && !logsError && (
            <p className="text-white/50 text-sm italic text-center py-4">No history yet.</p>
          )}
          {displayLogs.map((log) => (
            <motion.div
              key={log._id ?? log.timestamp}
              className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-2"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              layout
            >
              <span className="capitalize text-white font-medium text-sm">{log.emotion}</span>
              <span className="text-white/60 text-xs">{Math.round(log.confidence * 100)}%</span>
              <span className="text-white/40 text-xs">{formatTimestamp(log.timestamp)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * AnalyticsPanel — per-emotion count bar chart derived from sessionCounts.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { EmotionLabel } from '../types'
import { EMOTION_LABELS, getAccentColor } from '../utils/emotionUtils'

interface AnalyticsPanelProps {
  sessionCounts: Record<EmotionLabel, number>
}

/** Maps accent color names to Tailwind background classes for the bars. */
const BAR_COLOR_CLASSES: Record<string, string> = {
  yellow: 'bg-yellow-400',
  blue: 'bg-blue-400',
  red: 'bg-red-400',
  orange: 'bg-orange-400',
  lavender: 'bg-purple-300',
  purple: 'bg-purple-500',
  green: 'bg-green-400',
}

export function AnalyticsPanel({ sessionCounts }: AnalyticsPanelProps) {
  const maxCount = Math.max(1, ...EMOTION_LABELS.map((e) => sessionCounts[e] ?? 0))

  return (
    <div
      className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 flex flex-col gap-3"
      aria-label="Session emotion analytics"
    >
      <h2 className="text-white font-semibold text-lg tracking-wide">Session Analytics</h2>

      <div className="flex flex-col gap-2">
        {EMOTION_LABELS.map((emotion) => {
          const count = sessionCounts[emotion] ?? 0
          const pct = (count / maxCount) * 100
          const accentColor = getAccentColor(emotion)
          const barClass = BAR_COLOR_CLASSES[accentColor] ?? 'bg-white'

          return (
            <div key={emotion} className="flex items-center gap-3">
              {/* Label */}
              <span className="w-20 capitalize text-white/80 text-xs text-right shrink-0">
                {emotion}
              </span>

              {/* Bar track */}
              <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={maxCount}
                  aria-label={`${emotion}: ${count}`}
                />
              </div>

              {/* Count */}
              <span className="w-8 text-white/60 text-xs text-left shrink-0">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

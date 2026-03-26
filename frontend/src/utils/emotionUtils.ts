/**
 * Utility helpers for emotion labels, accent colours, and type guards.
 * Requirements: 2.7, 11.4
 */

import type { EmotionLabel } from '../types'

/** All seven emotion labels the Detection Engine can classify. */
export const EMOTION_LABELS: EmotionLabel[] = [
  'happy',
  'sad',
  'angry',
  'surprised',
  'neutral',
  'fearful',
  'disgusted',
]

const ACCENT_COLORS: Record<EmotionLabel, string> = {
  happy: 'yellow',
  sad: 'blue',
  angry: 'red',
  surprised: 'orange',
  neutral: 'lavender',
  fearful: 'purple',
  disgusted: 'green',
}

/** Returns the accent colour string associated with the given emotion. */
export function getAccentColor(emotion: EmotionLabel): string {
  return ACCENT_COLORS[emotion]
}

/** Type guard — returns true only for the seven known EmotionLabel values. */
export function isValidEmotionLabel(value: string): value is EmotionLabel {
  return (EMOTION_LABELS as string[]).includes(value)
}

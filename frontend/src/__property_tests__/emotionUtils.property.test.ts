// Feature: beauty-insight-studio, Property 4: Emotion-to-accent-color mapping is total and correct
// Feature: beauty-insight-studio, Property 14: Unknown emotion labels from API are rejected before render

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getAccentColor, isValidEmotionLabel, EMOTION_LABELS } from '../utils/emotionUtils'
import type { EmotionLabel } from '../types'

const EXPECTED_COLORS: Record<EmotionLabel, string> = {
  happy: 'yellow',
  sad: 'blue',
  angry: 'red',
  surprised: 'orange',
  neutral: 'lavender',
  fearful: 'purple',
  disgusted: 'green',
}

/**
 * Property 4: Emotion-to-accent-color mapping is total and correct
 * Validates: Requirements 2.7
 */
describe('P4: emotion-to-accent-color mapping is total and correct', () => {
  it('getAccentColor returns the correct color for every known emotion label', () => {
    fc.assert(
      fc.property(fc.constantFrom(...EMOTION_LABELS), (emotion) => {
        const color = getAccentColor(emotion)
        expect(color).toBe(EXPECTED_COLORS[emotion])
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 14: Unknown emotion labels from API are rejected before render
 * Validates: Requirements 11.4
 */
describe('P14: unknown emotion labels from API are rejected before render', () => {
  it('isValidEmotionLabel returns false for any string not in the known set', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !(EMOTION_LABELS as string[]).includes(s)),
        (unknownLabel) => {
          expect(isValidEmotionLabel(unknownLabel)).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
})

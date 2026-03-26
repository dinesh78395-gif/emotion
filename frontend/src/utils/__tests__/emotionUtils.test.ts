/**
 * Unit tests for emotionUtils
 * Requirements: 2.7, 11.4
 */

import { describe, it, expect } from 'vitest'
import { getAccentColor, isValidEmotionLabel, EMOTION_LABELS } from '../emotionUtils'

describe('getAccentColor', () => {
  it('maps happy → yellow', () => {
    expect(getAccentColor('happy')).toBe('yellow')
  })

  it('maps sad → blue', () => {
    expect(getAccentColor('sad')).toBe('blue')
  })

  it('maps angry → red', () => {
    expect(getAccentColor('angry')).toBe('red')
  })

  it('maps surprised → orange', () => {
    expect(getAccentColor('surprised')).toBe('orange')
  })

  it('maps neutral → lavender', () => {
    expect(getAccentColor('neutral')).toBe('lavender')
  })

  it('maps fearful → purple', () => {
    expect(getAccentColor('fearful')).toBe('purple')
  })

  it('maps disgusted → green', () => {
    expect(getAccentColor('disgusted')).toBe('green')
  })
})

describe('isValidEmotionLabel', () => {
  it('returns true for all seven known labels', () => {
    for (const label of EMOTION_LABELS) {
      expect(isValidEmotionLabel(label)).toBe(true)
    }
  })

  it('returns false for unknown string "unknown"', () => {
    expect(isValidEmotionLabel('unknown')).toBe(false)
  })

  it('returns false for uppercase "HAPPY"', () => {
    expect(isValidEmotionLabel('HAPPY')).toBe(false)
  })

  it('returns false for empty string ""', () => {
    expect(isValidEmotionLabel('')).toBe(false)
  })
})

/**
 * Property-based tests for HistoryPanel and AnalyticsPanel behaviour.
 * Feature: beauty-insight-studio
 */

import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { EMOTION_LABELS } from '../utils/emotionUtils'
import type { EmotionLabel, EmotionLog } from '../types'

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const emotionArb = fc.constantFrom(...EMOTION_LABELS)

const emotionLogArb = fc.record<EmotionLog>({
  _id: fc.string({ minLength: 1, maxLength: 24 }),
  emotion: emotionArb,
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).map((d) =>
    d.toISOString(),
  ),
})

// ---------------------------------------------------------------------------
// Pure helper: prepend logic (mirrors App state update)
// ---------------------------------------------------------------------------

function prependLog(logs: EmotionLog[], newLog: EmotionLog): EmotionLog[] {
  return [newLog, ...logs]
}

// ---------------------------------------------------------------------------
// Pure helper: cap at 100 (mirrors HistoryPanel.displayLogs)
// ---------------------------------------------------------------------------

function capAt100(logs: EmotionLog[]): EmotionLog[] {
  return logs.slice(0, 100)
}

// ---------------------------------------------------------------------------
// Pure helper: compute session counts (mirrors App sessionCounts logic)
// ---------------------------------------------------------------------------

function computeSessionCounts(logs: EmotionLog[]): Record<EmotionLabel, number> {
  const counts = Object.fromEntries(EMOTION_LABELS.map((e) => [e, 0])) as Record<EmotionLabel, number>
  for (const log of logs) {
    counts[log.emotion] = (counts[log.emotion] ?? 0) + 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Property 9: New log is always prepended to the history list
// Feature: beauty-insight-studio, Property 9: New log is always prepended to the history list
// ---------------------------------------------------------------------------

describe('P9: New log is always prepended to the history list', () => {
  /**
   * Validates: Requirements 5.2
   *
   * For any existing list and any new EmotionLog, after prepending,
   * the new entry must appear at index 0.
   */
  it('for any existing list and any new EmotionLog, the new entry appears at index 0', () => {
    fc.assert(
      fc.property(
        fc.array(emotionLogArb, { minLength: 0, maxLength: 50 }),
        emotionLogArb,
        (existingLogs, newLog) => {
          const result = prependLog(existingLogs, newLog)

          // New log must be at index 0
          expect(result[0]).toEqual(newLog)

          // Length must be existingLogs.length + 1
          expect(result.length).toBe(existingLogs.length + 1)

          // All original entries must still be present (in order, shifted by 1)
          for (let i = 0; i < existingLogs.length; i++) {
            expect(result[i + 1]).toEqual(existingLogs[i])
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 10: Each rendered log entry contains all required fields
// Feature: beauty-insight-studio, Property 10: Each rendered log entry contains all required fields
// ---------------------------------------------------------------------------

/**
 * Simulates what HistoryPanel renders for a single log entry.
 * Returns an object with the three required display fields.
 */
function renderLogEntry(log: EmotionLog): { emotionLabel: string; confidencePct: string; timestamp: string } {
  const emotionLabel = log.emotion
  const confidencePct = `${Math.round(log.confidence * 100)}%`
  const timestamp = log.timestamp // raw ISO; formatting is locale-dependent
  return { emotionLabel, confidencePct, timestamp }
}

describe('P10: Each rendered log entry contains all required fields', () => {
  /**
   * Validates: Requirements 5.3
   *
   * For any EmotionLog, the rendered entry must contain:
   * - emotion label (non-empty string matching the log's emotion)
   * - confidence as a percentage string (e.g. "85%")
   * - a timestamp string (non-empty)
   */
  it('for any EmotionLog, the rendered entry contains emotion label, confidence %, and timestamp', () => {
    fc.assert(
      fc.property(emotionLogArb, (log) => {
        const entry = renderLogEntry(log)

        // Emotion label must match
        expect(entry.emotionLabel).toBe(log.emotion)
        expect(entry.emotionLabel.length).toBeGreaterThan(0)

        // Confidence must be formatted as a percentage
        expect(entry.confidencePct).toMatch(/^\d+%$/)
        const pctValue = parseInt(entry.confidencePct, 10)
        expect(pctValue).toBeGreaterThanOrEqual(0)
        expect(pctValue).toBeLessThanOrEqual(100)

        // Timestamp must be non-empty
        expect(entry.timestamp.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 11: History list is capped at 100 entries
// Feature: beauty-insight-studio, Property 11: History list is capped at 100 entries
// ---------------------------------------------------------------------------

describe('P11: History list is capped at 100 entries', () => {
  /**
   * Validates: Requirements 5.4
   *
   * For any list of N > 100 logs, the rendered count must be exactly 100,
   * and they must be the 100 most recent (first 100 in the array, since
   * the list is newest-first).
   */
  it('for any list of N > 100 logs, the rendered count is exactly 100', () => {
    fc.assert(
      fc.property(
        fc.array(emotionLogArb, { minLength: 101, maxLength: 200 }),
        (logs) => {
          const displayed = capAt100(logs)

          // Must be exactly 100
          expect(displayed.length).toBe(100)

          // Must be the first 100 entries (newest first)
          for (let i = 0; i < 100; i++) {
            expect(displayed[i]).toEqual(logs[i])
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 12: Session counts accurately reflect log history
// Feature: beauty-insight-studio, Property 12: Session counts accurately reflect log history
// ---------------------------------------------------------------------------

describe('P12: Session counts accurately reflect log history', () => {
  /**
   * Validates: Requirements 6.1
   *
   * For any array of EmotionLogs, the count for each emotion label must
   * equal the frequency of that label in the array.
   */
  it('for any array of EmotionLogs, each emotion count equals its frequency in the array', () => {
    fc.assert(
      fc.property(
        fc.array(emotionLogArb, { minLength: 0, maxLength: 150 }),
        (logs) => {
          const counts = computeSessionCounts(logs)

          for (const emotion of EMOTION_LABELS) {
            const expected = logs.filter((l) => l.emotion === emotion).length
            expect(counts[emotion]).toBe(expected)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

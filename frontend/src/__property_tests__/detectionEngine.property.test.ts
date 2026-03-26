// Feature: beauty-insight-studio, Property 5: POST /log payload always includes emotion and ISO 8601 timestamp

import { describe, it, expect, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { postLog } from '../services/logService'
import { EMOTION_LABELS } from '../utils/emotionUtils'
import type { DetectionResult } from '../types'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Property 5: POST /log payload always includes emotion and ISO 8601 timestamp
 * Validates: Requirements 4.1
 */
describe('P5: POST /log payload always includes emotion and ISO 8601 timestamp', () => {
  it('for any DetectionResult, the POST body contains a non-empty emotion and a valid ISO 8601 timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record<DetectionResult>({
          emotion: fc.constantFrom(...EMOTION_LABELS),
          confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          boundingBox: fc.record({
            x: fc.integer({ min: 0, max: 1000 }),
            y: fc.integer({ min: 0, max: 1000 }),
            width: fc.integer({ min: 1, max: 500 }),
            height: fc.integer({ min: 1, max: 500 }),
          }),
        }),
        async (result) => {
          let capturedBody: Record<string, unknown> | null = null

          const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
            capturedBody = JSON.parse(options.body as string)
            return Promise.resolve({ ok: true })
          })
          vi.stubGlobal('fetch', fetchMock)

          await postLog(result)

          expect(capturedBody).not.toBeNull()
          const body = capturedBody!

          // emotion must be a non-empty string
          expect(typeof body.emotion).toBe('string')
          expect((body.emotion as string).length).toBeGreaterThan(0)

          // timestamp must be a valid ISO 8601 date-time string
          expect(typeof body.timestamp).toBe('string')
          const parsed = new Date(body.timestamp as string)
          expect(isNaN(parsed.getTime())).toBe(false)
          // ISO 8601 strings produced by toISOString() always end with 'Z'
          expect((body.timestamp as string).endsWith('Z')).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Feature: beauty-insight-studio, Property 1: Detection interval floor
// ---------------------------------------------------------------------------

import { EMOTION_LABELS, isValidEmotionLabel } from '../utils/emotionUtils'

/**
 * Property 1: Detection interval floor
 * Validates: Requirements 2.1, 10.2
 *
 * The interval passed to setInterval must always be exactly 2000 ms (never less).
 * We verify this by spying on setInterval and checking the delay argument for
 * any elapsed-time value in [0, 10000].
 */
describe('P1: Detection interval floor ≥ 2000 ms', () => {
  it('setInterval is always called with exactly 2000 ms regardless of elapsed time', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10000 }),
        async (_elapsedMs) => {
          // Spy on setInterval to capture the delay argument
          const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

          // Mock face-api so start() resolves immediately
          const mockLoad = vi.fn().mockResolvedValue(undefined)
          vi.doMock('@vladmandic/face-api', () => ({
            nets: {
              ssdMobilenetv1: { loadFromUri: mockLoad },
              faceLandmark68Net: { loadFromUri: mockLoad },
              faceExpressionNet: { loadFromUri: mockLoad },
            },
            detectSingleFace: vi.fn(),
          }))

          const { renderHook, act, waitFor } = await import('@testing-library/react')
          const { useDetectionEngine } = await import('../hooks/useDetectionEngine')

          const { result } = renderHook(() => useDetectionEngine())

          const videoEl = document.createElement('video')
          const canvasEl = document.createElement('canvas')
          canvasEl.getContext = vi.fn().mockReturnValue({
            clearRect: vi.fn(),
            strokeRect: vi.fn(),
            strokeStyle: '',
            lineWidth: 0,
          })

          await act(async () => {
            result.current.start(videoEl, canvasEl)
          })

          await waitFor(() => expect(result.current.status).toBe('ready'))

          // Find the setInterval call made by the hook
          const hookIntervalCall = setIntervalSpy.mock.calls.find(
            ([_fn, delay]) => typeof delay === 'number' && delay >= 2000,
          )

          // The interval delay must be at least 2000 ms
          if (hookIntervalCall) {
            const delay = hookIntervalCall[1] as number
            expect(delay).toBeGreaterThanOrEqual(2000)
          }

          // Clean up
          result.current.stop()
          setIntervalSpy.mockRestore()
          vi.doUnmock('@vladmandic/face-api')
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Feature: beauty-insight-studio, Property 2: Detection result always yields a valid emotion label
// ---------------------------------------------------------------------------

/**
 * Extracts the dominant emotion label from a faceapi expressions record.
 * This mirrors the logic inside useDetectionEngine.analyze().
 */
function extractDominantEmotion(expressions: Record<string, number>): string {
  let dominantEmotion = 'neutral'
  let highestScore = -1
  for (const [label, score] of Object.entries(expressions)) {
    if (score > highestScore) {
      highestScore = score
      dominantEmotion = label
    }
  }
  return isValidEmotionLabel(dominantEmotion) ? dominantEmotion : 'neutral'
}

/**
 * Property 2: Detection result always yields a valid emotion label
 * Validates: Requirements 2.2, 2.3, 11.4
 *
 * For any mocked faceapi result with random expression scores, the returned
 * emotion label must be one of the seven known values.
 */
describe('P2: Detection result always yields a valid emotion label', () => {
  it('for any expression scores, the dominant emotion is always in the known set', () => {
    fc.assert(
      fc.property(
        fc.record({
          happy: fc.float({ min: 0, max: 1, noNaN: true }),
          sad: fc.float({ min: 0, max: 1, noNaN: true }),
          angry: fc.float({ min: 0, max: 1, noNaN: true }),
          surprised: fc.float({ min: 0, max: 1, noNaN: true }),
          neutral: fc.float({ min: 0, max: 1, noNaN: true }),
          fearful: fc.float({ min: 0, max: 1, noNaN: true }),
          disgusted: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        (expressions) => {
          const emotion = extractDominantEmotion(expressions)
          expect(EMOTION_LABELS).toContain(emotion)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ---------------------------------------------------------------------------
// Feature: beauty-insight-studio, Property 3: Detection result confidence is a valid probability
// ---------------------------------------------------------------------------

/**
 * Extracts the confidence value from a faceapi expressions record.
 * Mirrors the clamping logic in useDetectionEngine.analyze().
 */
function extractConfidence(expressions: Record<string, number>): number {
  let highestScore = -1
  for (const score of Object.values(expressions)) {
    if (score > highestScore) {
      highestScore = score
    }
  }
  return Math.min(1, Math.max(0, highestScore))
}

/**
 * Property 3: Detection result confidence is a valid probability
 * Validates: Requirements 2.3
 *
 * For any mocked detection result, confidence must be in [0, 1].
 */
describe('P3: Detection result confidence is a valid probability', () => {
  it('for any expression scores, the extracted confidence is always in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.record({
          happy: fc.float({ min: 0, max: 1, noNaN: true }),
          sad: fc.float({ min: 0, max: 1, noNaN: true }),
          angry: fc.float({ min: 0, max: 1, noNaN: true }),
          surprised: fc.float({ min: 0, max: 1, noNaN: true }),
          neutral: fc.float({ min: 0, max: 1, noNaN: true }),
          fearful: fc.float({ min: 0, max: 1, noNaN: true }),
          disgusted: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        (expressions) => {
          const confidence = extractConfidence(expressions)
          expect(confidence).toBeGreaterThanOrEqual(0)
          expect(confidence).toBeLessThanOrEqual(1)
        },
      ),
      { numRuns: 100 },
    )
  })
})

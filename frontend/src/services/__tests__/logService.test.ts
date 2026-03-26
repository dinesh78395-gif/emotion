/**
 * Unit tests for logService.
 * Requirements: 4.1, 4.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { postLog, fetchLogs } from '../logService'
import type { DetectionResult, EmotionLog } from '../../types'

const mockResult: DetectionResult = {
  emotion: 'happy',
  confidence: 0.92,
  boundingBox: { x: 0, y: 0, width: 100, height: 100 },
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// postLog
// ---------------------------------------------------------------------------

describe('postLog', () => {
  it('calls POST /log with the correct payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const before = Date.now()
    await postLog(mockResult)
    const after = Date.now()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/log')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body as string)
    expect(body.emotion).toBe('happy')
    expect(body.confidence).toBe(0.92)

    // timestamp must be a valid ISO 8601 string within the test window
    const ts = new Date(body.timestamp).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after + 1000) // allow for fake timer drift
  })

  it('retries once (fetch called twice) when the first attempt fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const promise = postLog(mockResult)
    // Advance past the 1-second retry delay
    await vi.runAllTimersAsync()
    await promise

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does NOT throw when both attempts fail — only logs a console warning', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'))
    vi.stubGlobal('fetch', fetchMock)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const promise = postLog(mockResult)
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(warnSpy).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// fetchLogs
// ---------------------------------------------------------------------------

describe('fetchLogs', () => {
  it('returns the parsed JSON array on a 2xx response', async () => {
    const logs: EmotionLog[] = [
      { _id: '1', emotion: 'happy', confidence: 0.9, timestamp: '2024-01-01T00:00:00.000Z' },
    ]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(logs),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchLogs()
    expect(result).toEqual(logs)
    expect(fetchMock).toHaveBeenCalledWith('/logs')
  })

  it('throws an error on a non-2xx response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchLogs()).rejects.toThrow('GET /logs failed with status 500')
  })
})

// ---------------------------------------------------------------------------
// Integration tests: full POST → prepend → count flow (Task 11.4)
// Requirements: 4.1, 5.2, 6.1
// ---------------------------------------------------------------------------

import type { EmotionLabel } from '../../types'
import { EMOTION_LABELS, isValidEmotionLabel } from '../../utils/emotionUtils'

// ---------------------------------------------------------------------------
// Pure reducer logic extracted from App.tsx for direct testing
// ---------------------------------------------------------------------------

const EMPTY_SESSION_COUNTS = (): Record<EmotionLabel, number> =>
  Object.fromEntries(EMOTION_LABELS.map((e) => [e, 0])) as Record<EmotionLabel, number>

interface LogState {
  logs: import('../../types').EmotionLog[]
  sessionCounts: Record<EmotionLabel, number>
}

function prependLog(
  state: LogState,
  entry: import('../../types').EmotionLog
): LogState {
  const newLogs = [entry, ...state.logs].slice(0, 100)
  const newCounts = { ...state.sessionCounts }
  if (isValidEmotionLabel(entry.emotion)) {
    newCounts[entry.emotion] = (newCounts[entry.emotion] ?? 0) + 1
  }
  return { logs: newLogs, sessionCounts: newCounts }
}

describe('Integration: POST → prepend → count flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('postLog is called with the correct emotion and ISO timestamp when a DetectionResult is processed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result: import('../../types').DetectionResult = {
      emotion: 'happy',
      confidence: 0.88,
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
    }

    await postLog(result)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/log')
    const body = JSON.parse(options.body as string)
    expect(body.emotion).toBe('happy')
    expect(body.confidence).toBe(0.88)
    // Must be a valid ISO 8601 string
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('new log entry is prepended to the list (appears at index 0)', () => {
    const existing: import('../../types').EmotionLog[] = [
      { _id: '1', emotion: 'sad', confidence: 0.7, timestamp: '2024-01-01T00:00:00.000Z' },
      { _id: '2', emotion: 'neutral', confidence: 0.6, timestamp: '2024-01-01T00:01:00.000Z' },
    ]
    const state: LogState = {
      logs: existing,
      sessionCounts: EMPTY_SESSION_COUNTS(),
    }

    const newEntry: import('../../types').EmotionLog = {
      emotion: 'happy',
      confidence: 0.95,
      timestamp: '2024-01-01T00:02:00.000Z',
    }

    const next = prependLog(state, newEntry)

    expect(next.logs[0]).toEqual(newEntry)
    expect(next.logs).toHaveLength(3)
  })

  it('sessionCounts is incremented for the correct emotion after prepend', () => {
    const state: LogState = {
      logs: [],
      sessionCounts: EMPTY_SESSION_COUNTS(),
    }

    const entry: import('../../types').EmotionLog = {
      emotion: 'angry',
      confidence: 0.8,
      timestamp: '2024-01-01T00:00:00.000Z',
    }

    const next = prependLog(state, entry)

    expect(next.sessionCounts['angry']).toBe(1)
    // All other counts remain 0
    for (const label of EMOTION_LABELS) {
      if (label !== 'angry') {
        expect(next.sessionCounts[label]).toBe(0)
      }
    }
  })

  it('full flow: postLog fires, log is prepended, and count is incremented together', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result: import('../../types').DetectionResult = {
      emotion: 'surprised',
      confidence: 0.75,
      boundingBox: { x: 10, y: 10, width: 80, height: 80 },
    }

    // 1. Fire postLog (simulates App calling postLog on DetectionResult)
    await postLog(result)

    // 2. Build the log entry (simulates App building EmotionLog from DetectionResult)
    const logEntry: import('../../types').EmotionLog = {
      emotion: result.emotion,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    }

    // 3. Prepend to state (simulates PREPEND_LOG reducer action)
    const state: LogState = { logs: [], sessionCounts: EMPTY_SESSION_COUNTS() }
    const next = prependLog(state, logEntry)

    // Verify all three parts of the flow
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(next.logs[0].emotion).toBe('surprised')
    expect(next.sessionCounts['surprised']).toBe(1)
  })

  it('list is capped at 100 entries after many prepends', () => {
    let state: LogState = { logs: [], sessionCounts: EMPTY_SESSION_COUNTS() }

    for (let i = 0; i < 110; i++) {
      const entry: import('../../types').EmotionLog = {
        emotion: 'neutral',
        confidence: 0.5,
        timestamp: new Date(i * 1000).toISOString(),
      }
      state = prependLog(state, entry)
    }

    expect(state.logs).toHaveLength(100)
  })

  it('invalid emotion labels are not counted in sessionCounts', () => {
    const state: LogState = { logs: [], sessionCounts: EMPTY_SESSION_COUNTS() }

    const invalidEntry = {
      emotion: 'unknown_emotion' as EmotionLabel,
      confidence: 0.9,
      timestamp: '2024-01-01T00:00:00.000Z',
    }

    const next = prependLog(state, invalidEntry)

    // The entry is still prepended to logs (filtering happens at SET_LOGS level)
    // but sessionCounts should not be incremented for an invalid label
    for (const label of EMOTION_LABELS) {
      expect(next.sessionCounts[label]).toBe(0)
    }
  })
})

/**
 * App — root component owning global AppState.
 * Requirements: 1.1, 4.5, 5.4, 6.1, 7.4, 7.5, 7.6, 10.4, 11.4
 */

import { useEffect, useRef, useCallback, useReducer } from 'react'
import type { DetectionResult, EmotionLabel, EmotionLog } from './types'
import { EMOTION_LABELS, isValidEmotionLabel } from './utils/emotionUtils'
import { fetchLogs, postLog } from './services/logService'
import { LandingHero } from './components/LandingHero'
import { CameraController } from './components/CameraController'
import { HistoryPanel } from './components/HistoryPanel'
import { AnalyticsPanel } from './components/AnalyticsPanel'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

const EMPTY_SESSION_COUNTS = (): Record<EmotionLabel, number> =>
  Object.fromEntries(EMOTION_LABELS.map((e) => [e, 0])) as Record<EmotionLabel, number>

interface State {
  cameraActive: boolean
  modelStatus: 'idle' | 'loading' | 'ready' | 'error'
  modelError: string | null
  currentEmotion: DetectionResult | null
  noFaceDetected: boolean
  logs: EmotionLog[]
  sessionCounts: Record<EmotionLabel, number>
  logsError: string | null
}

const initialState: State = {
  cameraActive: false,
  modelStatus: 'idle',
  modelError: null,
  currentEmotion: null,
  noFaceDetected: false,
  logs: [],
  sessionCounts: EMPTY_SESSION_COUNTS(),
  logsError: null,
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SET_CAMERA_ACTIVE'; payload: boolean }
  | { type: 'SET_LOGS'; payload: EmotionLog[] }
  | { type: 'SET_LOGS_ERROR'; payload: string | null }
  | { type: 'PREPEND_LOG'; payload: EmotionLog }

function buildSessionCounts(logs: EmotionLog[]): Record<EmotionLabel, number> {
  const counts = EMPTY_SESSION_COUNTS()
  for (const log of logs) {
    if (isValidEmotionLabel(log.emotion)) {
      counts[log.emotion] += 1
    }
  }
  return counts
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CAMERA_ACTIVE':
      return { ...state, cameraActive: action.payload }

    case 'SET_LOGS': {
      // Task 9.2: filter out entries with unknown emotion labels
      const validLogs = action.payload.filter((log) => isValidEmotionLabel(log.emotion))
      return {
        ...state,
        logs: validLogs.slice(0, 100),
        sessionCounts: buildSessionCounts(validLogs.slice(0, 100)),
        logsError: null,
      }
    }

    case 'SET_LOGS_ERROR':
      return { ...state, logsError: action.payload }

    case 'PREPEND_LOG': {
      const newLogs = [action.payload, ...state.logs].slice(0, 100)
      const newCounts = { ...state.sessionCounts }
      newCounts[action.payload.emotion] = (newCounts[action.payload.emotion] ?? 0) + 1
      return {
        ...state,
        logs: newLogs,
        sessionCounts: newCounts,
        currentEmotion: null, // reset; caller sets via detection result
      }
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  // AbortController for the initial fetchLogs request
  const fetchAbortRef = useRef<AbortController | null>(null)

  // ------------------------------------------------------------------
  // On mount: load existing logs from the API
  // ------------------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController()
    fetchAbortRef.current = controller

    fetchLogs()
      .then((data) => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'SET_LOGS', payload: data })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'SET_LOGS_ERROR', payload: 'Failed to load history. Please retry.' })
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  // ------------------------------------------------------------------
  // Handle a new DetectionResult from CameraController
  // Task 9.2: only process if emotion label is valid
  // ------------------------------------------------------------------
  const handleDetectionResult = useCallback((result: DetectionResult) => {
    if (!isValidEmotionLabel(result.emotion)) return

    const logEntry: EmotionLog = {
      emotion: result.emotion,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    }

    // Fire-and-forget POST (logService handles silent retry internally)
    postLog(result)

    dispatch({ type: 'PREPEND_LOG', payload: logEntry })
  }, [])

  // ------------------------------------------------------------------
  // Camera start / stop
  // ------------------------------------------------------------------
  const handleStart = useCallback(() => {
    dispatch({ type: 'SET_CAMERA_ACTIVE', payload: true })
  }, [])

  const handleStop = useCallback(() => {
    dispatch({ type: 'SET_CAMERA_ACTIVE', payload: false })
  }, [])

  // ------------------------------------------------------------------
  // Retry loading logs (wired to HistoryPanel retry button)
  // ------------------------------------------------------------------
  const handleRetryLogs = useCallback(() => {
    dispatch({ type: 'SET_LOGS_ERROR', payload: null })

    fetchLogs()
      .then((data) => {
        dispatch({ type: 'SET_LOGS', payload: data })
      })
      .catch(() => {
        dispatch({ type: 'SET_LOGS_ERROR', payload: 'Failed to load history. Please retry.' })
      })
  }, [])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900">
      {/* Subtle peach/lavender overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 via-transparent to-purple-500/10 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Hero section */}
        <LandingHero
          cameraActive={state.cameraActive}
          onStart={handleStart}
          onStop={handleStop}
        />

        {/* Camera feed + detection */}
        <section className="flex justify-center">
          <div className="w-full max-w-lg">
            <CameraController
              cameraActive={state.cameraActive}
              onDetectionResult={handleDetectionResult}
              onStop={handleStop}
            />
          </div>
        </section>

        {/* History + Analytics panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HistoryPanel
            logs={state.logs}
            logsError={state.logsError}
            onRetry={handleRetryLogs}
          />
          <AnalyticsPanel sessionCounts={state.sessionCounts} />
        </div>
      </div>
    </div>
  )
}

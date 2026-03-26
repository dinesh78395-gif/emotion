/**
 * useDetectionEngine – custom React hook that wraps face-api.js inference.
 *
 * Requirements: 2.1, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 10.2
 *
 * Design decisions:
 * - face-api.js is lazy-imported only when start() is called (keeps initial
 *   page load fast).
 * - Models are loaded once and reused across retry cycles.
 * - Detection runs on a fixed 2 000 ms setInterval (never shorter).
 * - If no face is detected the lastResult is preserved so the UI can keep
 *   showing the previous emotion while noFaceDetected signals the absence.
 */

import { useRef, useState, useCallback } from 'react'
import type { DetectionResult, EmotionLabel } from '../types'
import { isValidEmotionLabel } from '../utils/emotionUtils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDetectionEngineReturn {
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMessage: string | null
  lastResult: DetectionResult | null
  noFaceDetected: boolean
  start: (videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) => void
  stop: () => void
  retry: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DETECTION_INTERVAL_MS = 2000
const MODELS_PATH = '/models'

// ---------------------------------------------------------------------------
// Module-level cache so models are only fetched once per page session
// ---------------------------------------------------------------------------

let faceapiModule: typeof import('@vladmandic/face-api') | null = null
let modelsLoaded = false

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDetectionEngine(): UseDetectionEngineReturn {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<DetectionResult | null>(null)
  const [noFaceDetected, setNoFaceDetected] = useState(false)

  // Refs so analyze() always has the latest DOM elements without stale closure
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ------------------------------------------------------------------
  // analyze – called by the interval; reads from refs
  // ------------------------------------------------------------------
  const analyze = useCallback(async () => {
    const faceapi = faceapiModule
    const videoEl = videoRef.current
    const canvasEl = canvasRef.current

    if (!faceapi || !videoEl || !canvasEl) return

    try {
      const detection = await faceapi
        .detectSingleFace(videoEl)
        .withFaceLandmarks()
        .withFaceExpressions()

      if (!detection) {
        setNoFaceDetected(true)
        return
      }

      // Extract dominant emotion
      const expressions = detection.expressions as unknown as Record<string, number>
      let dominantEmotion: string = 'neutral'
      let highestScore = -1

      for (const [label, score] of Object.entries(expressions)) {
        if (score > highestScore) {
          highestScore = score
          dominantEmotion = label
        }
      }

      // Guard: only accept known emotion labels
      const emotion: EmotionLabel = isValidEmotionLabel(dominantEmotion)
        ? dominantEmotion
        : 'neutral'

      const confidence = Math.min(1, Math.max(0, highestScore))

      const box = detection.detection.box
      const boundingBox = {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      }

      // Draw bounding box on canvas
      const ctx = canvasEl.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
        ctx.strokeStyle = '#d4af37' // gold accent
        ctx.lineWidth = 2
        ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height)
      }

      setLastResult({ emotion, confidence, boundingBox })
      setNoFaceDetected(false)
    } catch (err) {
      // Non-fatal: log and continue the detection loop
      console.error('[useDetectionEngine] analyze error:', err)
    }
  }, [])

  // ------------------------------------------------------------------
  // start
  // ------------------------------------------------------------------
  const start = useCallback(
    async (videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) => {
      // Store refs for use inside analyze()
      videoRef.current = videoEl
      canvasRef.current = canvasEl

      setStatus('loading')
      setErrorMessage(null)

      try {
        // Lazy-import face-api.js only on first call
        if (!faceapiModule) {
          faceapiModule = await import('@vladmandic/face-api')
        }

        const faceapi = faceapiModule

        // Load models only once per page session
        if (!modelsLoaded) {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
            faceapi.nets.faceExpressionNet.loadFromUri(MODELS_PATH),
          ])
          modelsLoaded = true
        }

        setStatus('ready')

        // Clear any existing interval before starting a new one
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current)
        }

        // Start detection loop at exactly 2 000 ms
        intervalRef.current = setInterval(analyze, DETECTION_INTERVAL_MS)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load detection models'
        setStatus('error')
        setErrorMessage(message)
      }
    },
    [analyze],
  )

  // ------------------------------------------------------------------
  // stop
  // ------------------------------------------------------------------
  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clear the canvas overlay
    const canvasEl = canvasRef.current
    if (canvasEl) {
      const ctx = canvasEl.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
      }
    }
  }, [])

  // ------------------------------------------------------------------
  // retry
  // ------------------------------------------------------------------
  const retry = useCallback(() => {
    setStatus('idle')
    setErrorMessage(null)

    const videoEl = videoRef.current
    const canvasEl = canvasRef.current

    if (videoEl && canvasEl) {
      start(videoEl, canvasEl)
    }
  }, [start])

  return { status, errorMessage, lastResult, noFaceDetected, start, stop, retry }
}

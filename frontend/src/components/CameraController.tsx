/**
 * CameraController — manages getUserMedia lifecycle, renders <video> + <canvas> overlay.
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 3.4, 8.5, 10.1, 11.1
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDetectionEngine } from '../hooks/useDetectionEngine'
import { LoadingOverlay } from './LoadingOverlay'
import { EmotionDisplay } from './EmotionDisplay'
import type { DetectionResult } from '../types'

interface CameraControllerProps {
  cameraActive: boolean
  onDetectionResult: (result: DetectionResult) => void
  onStop: () => void
}

export function CameraController({ cameraActive, onDetectionResult, onStop }: CameraControllerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [unsupportedBrowser, setUnsupportedBrowser] = useState(false)

  const { status, errorMessage, lastResult, noFaceDetected, start, stop, retry } =
    useDetectionEngine()

  // ------------------------------------------------------------------
  // Start camera + detection
  // ------------------------------------------------------------------
  const startCamera = useCallback(async () => {
    setPermissionError(null)

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setUnsupportedBrowser(true)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream

      const videoEl = videoRef.current
      if (videoEl) {
        videoEl.srcObject = stream
        await videoEl.play()

        const canvasEl = canvasRef.current
        if (canvasEl) {
          canvasEl.width = videoEl.videoWidth || 640
          canvasEl.height = videoEl.videoHeight || 480
          start(videoEl, canvasEl)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPermissionError('Camera access was denied. Please allow camera access to use this feature.')
      } else {
        setPermissionError('Could not access the camera. Please check your device settings.')
      }
      onStop()
    }
  }, [start, onStop])

  // ------------------------------------------------------------------
  // Stop camera + detection
  // ------------------------------------------------------------------
  const stopCamera = useCallback(() => {
    stop()

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const videoEl = videoRef.current
    if (videoEl) {
      videoEl.srcObject = null
    }
  }, [stop])

  // ------------------------------------------------------------------
  // React to cameraActive prop changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (cameraActive) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      // Cleanup on unmount
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive])

  // ------------------------------------------------------------------
  // Forward detection results to parent
  // ------------------------------------------------------------------
  useEffect(() => {
    if (lastResult) {
      onDetectionResult(lastResult)
    }
  }, [lastResult, onDetectionResult])

  // ------------------------------------------------------------------
  // Unsupported browser
  // ------------------------------------------------------------------
  if (unsupportedBrowser) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 text-center">
        <p className="text-white font-semibold text-lg mb-2">Browser Not Supported</p>
        <p className="text-white/70 text-sm">
          Your browser does not support camera access. Please use a modern browser such as{' '}
          <span className="text-pink-300 font-medium">Chrome</span>,{' '}
          <span className="text-pink-300 font-medium">Firefox</span>, or{' '}
          <span className="text-pink-300 font-medium">Edge</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Permission denied error */}
      {permissionError && (
        <div className="w-full rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3">
          <p className="text-red-300 text-sm">{permissionError}</p>
        </div>
      )}

      {/* Model load error */}
      {status === 'error' && errorMessage && (
        <div className="w-full rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-red-300 text-sm">{errorMessage}</p>
          <button
            onClick={retry}
            className="text-xs font-medium text-white bg-red-500/40 hover:bg-red-500/60 transition-colors rounded-lg px-3 py-1 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Camera feed */}
      <AnimatePresence>
        {cameraActive && (
          <motion.div
            key="camera-feed"
            className="relative rounded-2xl overflow-hidden border border-white/20 shadow-lg"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Video element */}
            <video
              ref={videoRef}
              className="block w-full max-w-lg"
              autoPlay
              playsInline
              muted
              aria-label="Camera feed"
            />

            {/* Canvas overlay for bounding box */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            />

            {/* Loading overlay during model load */}
            <LoadingOverlay modelStatus={status} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emotion display — shown when detection is ready */}
      {cameraActive && status === 'ready' && (
        <EmotionDisplay result={lastResult} noFaceDetected={noFaceDetected} />
      )}
    </div>
  )
}

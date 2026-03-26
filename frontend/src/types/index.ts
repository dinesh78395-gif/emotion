/**
 * Shared TypeScript types for Beauty Insight Studio.
 * Requirements: 2.2, 2.3, 4.1
 */

/** The seven emotion labels the Detection Engine can classify. */
export type EmotionLabel =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'neutral'
  | 'fearful'
  | 'disgusted'

/** A rectangle surrounding a detected face on the canvas overlay. */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/** The result returned by the Detection Engine for a single analyzed frame. */
export interface DetectionResult {
  emotion: EmotionLabel
  /** Probability value in the closed interval [0, 1]. */
  confidence: number
  boundingBox: BoundingBox
}

/** A persisted emotion record stored in MongoDB and returned by GET /logs. */
export interface EmotionLog {
  /** MongoDB ObjectId serialized as a string. Optional on creation. */
  _id?: string
  emotion: EmotionLabel
  /** Stored as a 0–1 float. */
  confidence: number
  /** ISO 8601 date-time string. */
  timestamp: string
}

/** Global application state owned by the root App component. */
export interface AppState {
  cameraActive: boolean
  modelStatus: 'idle' | 'loading' | 'ready' | 'error'
  modelError: string | null
  currentEmotion: DetectionResult | null
  noFaceDetected: boolean
  /** Capped at 100 entries, newest first. */
  logs: EmotionLog[]
  sessionCounts: Record<EmotionLabel, number>
  logsError: string | null
}

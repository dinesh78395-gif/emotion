# Implementation Plan: Beauty Insight Studio

## Overview

Incremental build starting with project scaffolding, then backend API, then frontend detection engine, UI components, and finally wiring everything together with tests throughout.

## Tasks

- [x] 1. Scaffold project structure and shared types
  - Create `frontend/` (Vite + React + TypeScript + Tailwind CSS + Framer Motion) and `backend/` (Node.js + Express + TypeScript + Mongoose) directories
  - Define shared TypeScript types: `EmotionLabel`, `DetectionResult`, `BoundingBox`, `EmotionLog`, `AppState` in `frontend/src/types/index.ts`
  - Configure Vitest for frontend and backend test runners
  - Install `fast-check` in both frontend and backend
  - _Requirements: 2.2, 2.3, 4.1_

- [x] 2. Implement backend data model and API server
  - [x] 2.1 Create `backend/src/models/EmotionLog.ts` Mongoose schema with `emotion` enum, `confidence`, `timestamp` (indexed), and `timestamps: true`
    - _Requirements: 4.2, 9.3_
  - [x] 2.2 Implement `backend/src/controllers/logsController.ts` with `create` (validate emotion + timestamp, insert, return 201/400) and `list` (query sorted `{ timestamp: -1 }`, return JSON array)
    - _Requirements: 4.2, 4.3, 4.4, 9.1, 9.2_
  - [x] 2.3 Implement `backend/src/routes/logs.ts` wiring `POST /log → create` and `GET /logs → list`
    - _Requirements: 9.1, 9.2_
  - [x] 2.4 Implement `backend/src/server.ts`: connect MongoDB via `MONGODB_URI` env var (exit on failure), register CORS middleware with configured frontend origin, register routes, start listener
    - _Requirements: 9.3, 9.4, 9.5_
  - [x] 2.5 Write unit tests for `logsController` — valid POST returns 201, missing `emotion` returns 400, missing `timestamp` returns 400, GET returns array sorted descending
    - _Requirements: 4.2, 4.3, 4.4_
    - `backend/src/controllers/__tests__/logsController.test.ts`
  - [x] 2.6 Write unit tests for `logs` routes — route wiring, 404 on unknown paths
    - _Requirements: 9.1, 9.2_
    - `backend/src/routes/__tests__/logs.test.ts`
  - [x] 2.7 Write property test: P6 — server returns 201 for all valid POST /log requests
    - **Property 6: Server returns 201 for all valid POST /log requests**
    - **Validates: Requirements 4.2, 9.1**
    - `backend/src/__property_tests__/logsApi.property.test.ts`
  - [x] 2.8 Write property test: P7 — server returns 400 for all incomplete POST /log requests
    - **Property 7: Server returns 400 for all incomplete POST /log requests**
    - **Validates: Requirements 4.3**
    - `backend/src/__property_tests__/logsApi.property.test.ts`
  - [x] 2.9 Write property test: P8 — GET /logs returns logs in descending timestamp order
    - **Property 8: GET /logs returns logs in descending timestamp order**
    - **Validates: Requirements 4.4, 9.2**
    - `backend/src/__property_tests__/logsApi.property.test.ts`
  - [x] 2.10 Write property test: P13 — CORS header present on all API responses
    - **Property 13: CORS header present on all API responses**
    - **Validates: Requirements 9.5**
    - `backend/src/__property_tests__/logsApi.property.test.ts`

- [x] 3. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement emotion utility functions
  - [x] 4.1 Create `frontend/src/utils/emotionUtils.ts` with:
    - `EMOTION_LABELS` constant array of all seven labels
    - `getAccentColor(emotion: EmotionLabel): string` mapping happy→yellow, sad→blue, angry→red, surprised→orange, neutral→lavender, fearful→purple, disgusted→green
    - `isValidEmotionLabel(value: string): value is EmotionLabel` type guard
    - _Requirements: 2.7, 11.4_
  - [x] 4.2 Write unit tests for `emotionUtils` — all seven mappings, unknown label returns false
    - `frontend/src/utils/__tests__/emotionUtils.test.ts`
    - _Requirements: 2.7, 11.4_
  - [x] 4.3 Write property test: P4 — emotion-to-accent-color mapping is total and correct
    - **Property 4: Emotion-to-accent-color mapping is total and correct**
    - **Validates: Requirements 2.7**
    - `frontend/src/__property_tests__/emotionUtils.property.test.ts`
  - [x] 4.4 Write property test: P14 — unknown emotion labels from API are rejected before render
    - **Property 14: Unknown emotion labels from API are rejected before render**
    - **Validates: Requirements 11.4**
    - `frontend/src/__property_tests__/emotionUtils.property.test.ts`

- [x] 5. Implement log service
  - [x] 5.1 Create `frontend/src/services/logService.ts` with:
    - `postLog(result: DetectionResult): Promise<void>` — POST to `/log` with `{ emotion, confidence, timestamp: new Date().toISOString() }`, silent retry once after 1 s on failure, console warning if retry fails
    - `fetchLogs(): Promise<EmotionLog[]>` — GET `/logs`, throw on non-2xx
    - _Requirements: 4.1, 4.6_
  - [x] 5.2 Write unit tests for `logService` — POST called with correct payload, retry on failure (called twice), no throw on retry failure, fetchLogs returns array
    - `frontend/src/services/__tests__/logService.test.ts`
    - _Requirements: 4.1, 4.6_
  - [x] 5.3 Write property test: P5 — POST /log payload always includes emotion and ISO 8601 timestamp
    - **Property 5: POST /log payload always includes emotion and ISO 8601 timestamp**
    - **Validates: Requirements 4.1**
    - `frontend/src/__property_tests__/detectionEngine.property.test.ts`

- [x] 6. Implement `useDetectionEngine` hook
  - [x] 6.1 Create `frontend/src/hooks/useDetectionEngine.ts`:
    - Lazy-import face-api.js and load SSD Mobilenet V1, Face Landmark 68, Face Expression models from `/models`
    - Manage `status: 'idle' | 'loading' | 'ready' | 'error'` and `errorMessage`
    - On `start(videoEl, canvasEl)`: load models (if not loaded), then set `setInterval` with floor of 2000 ms calling `analyze()`
    - `analyze()`: call `faceapi.detectSingleFace().withFaceLandmarks().withFaceExpressions()`, extract dominant emotion + confidence + bounding box, draw bounding box on canvas, set `lastResult` and `noFaceDetected`
    - On `stop()`: clear interval, clear canvas
    - Expose `retry()` to re-attempt model loading
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 10.2_
  - [x] 6.2 Write unit tests for `useDetectionEngine` — status transitions (idle→loading→ready), model load failure sets error, lazy-load not triggered before start, stop clears interval
    - `frontend/src/hooks/__tests__/useDetectionEngine.test.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.3 Write property test: P1 — detection interval floor ≥ 2000 ms
    - **Property 1: Detection interval floor**
    - **Validates: Requirements 2.1, 10.2**
    - `frontend/src/__property_tests__/detectionEngine.property.test.ts`
  - [x] 6.4 Write property test: P2 — detection result always yields a valid emotion label
    - **Property 2: Detection result always yields a valid emotion label**
    - **Validates: Requirements 2.2, 2.3, 11.4**
    - `frontend/src/__property_tests__/detectionEngine.property.test.ts`
  - [x] 6.5 Write property test: P3 — detection result confidence is a valid probability
    - **Property 3: Detection result confidence is a valid probability**
    - **Validates: Requirements 2.3**
    - `frontend/src/__property_tests__/detectionEngine.property.test.ts`

- [x] 7. Checkpoint — Ensure all hook and service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement UI components
  - [x] 8.1 Create `frontend/src/components/LoadingOverlay.tsx` — animated spinner + "Loading face detection models…" label, shown when `modelStatus === 'loading'`
    - _Requirements: 3.2_
  - [x] 8.2 Create `frontend/src/components/ToastNotification.tsx` — non-blocking overlay, auto-dismisses after 4 s, uses Framer Motion for entry/exit
    - _Requirements: 11.2_
  - [x] 8.3 Create `frontend/src/components/EmotionDisplay.tsx` — shows current emotion label, confidence %, accent glow color from `getAccentColor`; uses `AnimatePresence` for fade/slide on emotion change
    - _Requirements: 2.6, 2.7, 8.1_
  - [x] 8.4 Create `frontend/src/components/HistoryPanel.tsx`:
    - Scrollable Glass_Card listing `EmotionLog[]` (capped at 100, newest first)
    - Prepend new entries with slide-in Framer Motion animation
    - Each entry shows emotion label, confidence as %, formatted timestamp
    - Inline error message + retry button when `logsError` is set
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.3_
  - [x] 8.5 Create `frontend/src/components/AnalyticsPanel.tsx`:
    - Glass_Card with per-emotion count bar chart (CSS bars) derived from `sessionCounts`
    - Updates reactively; no page reload required
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 8.6 Create `frontend/src/components/CameraController.tsx`:
    - Manages `getUserMedia` lifecycle; renders `<video>` + `<canvas>` overlay
    - Calls `useDetectionEngine` hook; passes `videoEl` and `canvasEl` refs on start
    - Renders `LoadingOverlay` during model load, `EmotionDisplay` when ready
    - Handles unsupported browser (`navigator.mediaDevices` undefined) and permission denied errors
    - Scale-in entry animation (400 ms) on camera feed mount
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 3.4, 8.5, 10.1, 11.1_
  - [x] 8.7 Create `frontend/src/components/LandingHero.tsx`:
    - Title "Beauty Insight Studio", subtitle "Your face tells a story — we reveal it"
    - Rotating quote carousel cycling every 4 s
    - Animated particle background
    - "Start Camera" / "Stop Camera" button with hover animation
    - _Requirements: 1.1, 7.1, 7.2, 7.3, 8.3_
  - [x] 8.8 Write unit tests for `CameraController` — getUserMedia success/failure, stream release on stop, unsupported browser message
    - `frontend/src/components/__tests__/CameraController.test.tsx`
    - _Requirements: 1.2, 1.3, 1.6, 11.1_
  - [x] 8.9 Write unit tests for `HistoryPanel` — GET /logs on mount, inline error + retry on failure, correct rendering of entries
    - `frontend/src/components/__tests__/HistoryPanel.test.tsx`
    - _Requirements: 4.5, 5.1, 5.3, 11.3_
  - [x] 8.10 Write unit tests for `AnalyticsPanel` — counts update reactively, renders all seven emotion labels
    - `frontend/src/components/__tests__/AnalyticsPanel.test.tsx`
    - _Requirements: 6.1, 6.2_
  - [x] 8.11 Write property test: P9 — new log is always prepended to history list
    - **Property 9: New log is always prepended to the history list**
    - **Validates: Requirements 5.2**
    - `frontend/src/__property_tests__/historyPanel.property.test.ts`
  - [x] 8.12 Write property test: P10 — each rendered log entry contains all required fields
    - **Property 10: Each rendered log entry contains all required fields**
    - **Validates: Requirements 5.3**
    - `frontend/src/__property_tests__/historyPanel.property.test.ts`
  - [x] 8.13 Write property test: P11 — history list is capped at 100 entries
    - **Property 11: History list is capped at 100 entries**
    - **Validates: Requirements 5.4**
    - `frontend/src/__property_tests__/historyPanel.property.test.ts`
  - [x] 8.14 Write property test: P12 — session counts accurately reflect log history
    - **Property 12: Session counts accurately reflect log history**
    - **Validates: Requirements 6.1**
    - `frontend/src/__property_tests__/historyPanel.property.test.ts`

- [x] 9. Implement root `App` component and global state
  - [x] 9.1 Create `frontend/src/App.tsx`:
    - Own global `AppState` (camera active, model status, current emotion, logs capped at 100, session counts, errors)
    - On mount: call `fetchLogs()`, populate `logs` and `sessionCounts`; set `logsError` on failure
    - On new `DetectionResult`: call `postLog()`, prepend to `logs` (cap at 100), increment `sessionCounts`
    - On unmount: clear all timers, cancel pending fetch requests (AbortController)
    - Render `LandingHero`, `CameraController`, `HistoryPanel`, `AnalyticsPanel`
    - Apply base gradient theme (pink/lavender/peach), glassmorphism Glass_Card styles via Tailwind
    - _Requirements: 1.1, 4.5, 5.4, 6.1, 7.4, 7.5, 7.6, 10.4, 11.4_
  - [x] 9.2 Validate unknown emotion labels from API response using `isValidEmotionLabel` before adding to `logs` or `sessionCounts`
    - _Requirements: 11.4_

- [x] 10. Checkpoint — Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Final integration and wiring
  - [x] 11.1 Wire `CameraController` detection results into `App` state: on each `DetectionResult`, call `postLog`, prepend log entry, update `sessionCounts`
    - _Requirements: 4.1, 5.2, 6.1_
  - [x] 11.2 Wire `HistoryPanel` retry button to re-call `fetchLogs()` and update `logs` / `logsError` in `App` state
    - _Requirements: 11.3_
  - [x] 11.3 Confirm `Stop Camera` releases media stream and clears detection interval within 500 ms; verify `App` unmount clears all timers and AbortControllers
    - _Requirements: 1.5, 1.6, 10.1, 10.4_
  - [x] 11.4 Write integration tests for full POST→prepend→count flow using mocked fetch
    - `frontend/src/services/__tests__/logService.test.ts`
    - _Requirements: 4.1, 5.2, 6.1_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` and a comment tag `// Feature: beauty-insight-studio, Property N: <text>`
- Unit tests use Vitest for both frontend and backend
- All AI inference runs client-side; the backend only receives emotion label + timestamp

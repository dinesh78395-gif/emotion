# Requirements Document

## Introduction

Beauty Insight Studio is an AI-powered web application that uses the device webcam to detect human facial emotions in real time. The application presents detected emotions with a luxury beauty parlor aesthetic, stores emotion logs with timestamps, and provides analytics over the session history. It is built with React (Vite), Tailwind CSS, Framer Motion on the frontend, face-api.js for in-browser AI inference, and a Node.js/Express backend with MongoDB for persistence.

## Glossary

- **App**: The Beauty Insight Studio web application as a whole.
- **Camera_Feed**: The live video stream captured from the user's webcam and rendered in the browser.
- **Detection_Engine**: The face-api.js integration responsible for face detection and emotion classification.
- **Emotion_Log**: A persisted record containing a detected emotion label and an ISO 8601 timestamp.
- **Log_Store**: The backend MongoDB collection that persists Emotion_Logs.
- **API_Server**: The Node.js/Express HTTP server exposing the `/log` and `/logs` endpoints.
- **Analytics_Panel**: The UI component that displays aggregated emotion counts or a simple chart.
- **Glass_Card**: A UI container styled with glassmorphism (frosted-glass background, border, blur).
- **Confidence_Score**: The probability value (0–1) returned by the Detection_Engine for the dominant emotion.
- **Bounding_Box**: A rectangle drawn on the canvas overlay that surrounds the detected face.

---

## Requirements

### Requirement 1: Webcam Activation

**User Story:** As a visitor, I want to activate the webcam by clicking a button, so that I control when camera access is requested.

#### Acceptance Criteria

1. THE App SHALL display a "Start Camera" button on the landing page before any camera access is requested.
2. WHEN the user clicks "Start Camera", THE App SHALL request browser permission to access the webcam.
3. IF the user denies camera permission, THEN THE App SHALL display a descriptive error message explaining that camera access is required.
4. WHEN camera permission is granted, THE App SHALL render the Camera_Feed with a scale-in entry animation within 1 second.
5. WHEN the Camera_Feed is active, THE App SHALL display a "Stop Camera" button that halts the Camera_Feed and stops all detection.
6. WHEN the user clicks "Stop Camera", THE App SHALL release the webcam media stream to avoid resource leaks.

---

### Requirement 2: Face Detection and Emotion Recognition

**User Story:** As a user, I want the app to detect my face and recognize my emotion automatically, so that I can see my emotional state in real time.

#### Acceptance Criteria

1. WHILE the Camera_Feed is active, THE Detection_Engine SHALL analyze frames at an interval of 2–3 seconds.
2. WHEN a frame is analyzed, THE Detection_Engine SHALL detect at least the following emotion labels: happy, sad, angry, surprised, neutral, fearful, disgusted.
3. WHEN a face is detected, THE Detection_Engine SHALL return the dominant emotion label and its Confidence_Score.
4. WHEN a face is detected, THE App SHALL draw a Bounding_Box around the face on a canvas overlay aligned with the Camera_Feed.
5. IF no face is detected in a frame, THEN THE App SHALL display a "No face detected" status message without logging an Emotion_Log.
6. WHEN the dominant emotion changes, THE App SHALL update the displayed emotion label with a fade/slide transition animation.
7. WHEN the dominant emotion changes, THE App SHALL update the UI accent color: happy → yellow glow, sad → blue glow, angry → red glow, surprised → orange glow, neutral → lavender glow, fearful → purple glow, disgusted → green glow.

---

### Requirement 3: AI Model Loading

**User Story:** As a user, I want the AI models to load efficiently in the background, so that the app remains responsive during initialization.

#### Acceptance Criteria

1. THE Detection_Engine SHALL lazy-load face-api.js models only after the user clicks "Start Camera".
2. WHILE models are loading, THE App SHALL display a loading animation with a descriptive status label.
3. WHEN all required models are loaded, THE App SHALL hide the loading animation and activate the detection interval.
4. IF a model fails to load, THEN THE App SHALL display a descriptive error message and offer a retry action.
5. THE Detection_Engine SHALL load the following model types: SSD Mobilenet V1 (face detection), Face Landmark 68 (landmarks), Face Expression (emotion classification).

---

### Requirement 4: Emotion Log Persistence

**User Story:** As a user, I want each detected emotion to be saved with a timestamp, so that I can review my emotional history.

#### Acceptance Criteria

1. WHEN a face is detected and an emotion is classified, THE App SHALL send a POST request to `POST /log` with the payload `{ "emotion": "<label>", "timestamp": "<ISO 8601>" }`.
2. WHEN the API_Server receives a valid `POST /log` request, THE API_Server SHALL persist the Emotion_Log to the Log_Store and respond with HTTP 201.
3. IF the `POST /log` request payload is missing the `emotion` or `timestamp` field, THEN THE API_Server SHALL respond with HTTP 400 and a descriptive error message.
4. THE API_Server SHALL expose `GET /logs` which returns all Emotion_Logs from the Log_Store ordered by timestamp descending.
5. WHEN the App loads, THE App SHALL fetch all existing Emotion_Logs from `GET /logs` and display them in the history panel.
6. IF the `POST /log` network request fails, THEN THE App SHALL silently retry once and log a console warning without interrupting the detection loop.

---

### Requirement 5: Emotion History Display

**User Story:** As a user, I want to see a scrollable history of my detected emotions, so that I can track how my mood has changed over time.

#### Acceptance Criteria

1. THE App SHALL display all Emotion_Logs inside a scrollable Glass_Card component.
2. WHEN a new Emotion_Log is added, THE App SHALL prepend it to the history list with a slide-in animation.
3. THE App SHALL display each Emotion_Log entry showing the emotion label, Confidence_Score as a percentage, and the formatted timestamp.
4. WHILE the history list contains more than 100 entries, THE App SHALL limit the visible list to the 100 most recent entries.

---

### Requirement 6: Emotion Analytics

**User Story:** As a user, I want to see a summary of my detected emotions, so that I can understand my emotional patterns during the session.

#### Acceptance Criteria

1. THE Analytics_Panel SHALL display the count of each detected emotion label for the current session.
2. WHEN the emotion count data changes, THE Analytics_Panel SHALL update the display without a full page reload.
3. THE Analytics_Panel SHALL render a simple bar chart or count visualization using the session Emotion_Log data.
4. THE Analytics_Panel SHALL be displayed within a Glass_Card component.

---

### Requirement 7: Landing Page and UI Theme

**User Story:** As a visitor, I want an aesthetically pleasing landing page, so that the app feels premium and engaging.

#### Acceptance Criteria

1. THE App SHALL display the title "Beauty Insight Studio" and the subtitle "Your face tells a story — we reveal it" on the landing page.
2. THE App SHALL display a rotating carousel of beauty-themed quotes that cycles automatically every 4 seconds.
3. THE App SHALL render an animated background consisting of floating or particle elements throughout the session.
4. THE App SHALL apply a soft gradient color palette using pink, lavender, and peach tones as the base theme.
5. THE App SHALL apply glassmorphism styling (backdrop blur, semi-transparent background, subtle border) to all Glass_Card components.
6. THE App SHALL apply glowing border or shadow effects to interactive elements and active state indicators.

---

### Requirement 8: Animations and Transitions

**User Story:** As a user, I want smooth animations throughout the app, so that the experience feels polished and fluid.

#### Acceptance Criteria

1. THE App SHALL use Framer Motion for all entry, exit, and state-change animations.
2. WHEN a component mounts, THE App SHALL animate it with an entry animation (fade-in, scale-in, or slide-in as appropriate).
3. WHEN the user hovers over an interactive button, THE App SHALL apply a hover animation (scale or glow effect).
4. THE App SHALL maintain a rendering frame rate of 60fps during normal operation on a modern desktop browser.
5. WHEN the Camera_Feed mounts, THE App SHALL animate it with a scale-in transition over 400ms.

---

### Requirement 9: API Server

**User Story:** As a developer, I want a clean REST API, so that the frontend and backend are properly decoupled.

#### Acceptance Criteria

1. THE API_Server SHALL expose `POST /log` accepting `application/json` with fields `emotion` (string) and `timestamp` (ISO 8601 string).
2. THE API_Server SHALL expose `GET /logs` returning a JSON array of all Emotion_Log objects ordered by timestamp descending.
3. THE API_Server SHALL connect to MongoDB using an environment variable `MONGODB_URI`.
4. IF the MongoDB connection fails on startup, THEN THE API_Server SHALL log a descriptive error and exit with a non-zero status code.
5. THE API_Server SHALL include CORS headers permitting requests from the configured frontend origin.
6. THE API_Server SHALL respond to all requests within 2 seconds under normal operating conditions.

---

### Requirement 10: Performance and Resource Management

**User Story:** As a user, I want the app to run smoothly without degrading my device performance, so that I can use it comfortably for extended sessions.

#### Acceptance Criteria

1. WHEN the user clicks "Stop Camera", THE App SHALL clear all active detection intervals and release the webcam media stream within 500ms.
2. THE Detection_Engine SHALL run inference at an interval no shorter than 2 seconds to avoid CPU/GPU overload.
3. THE App SHALL lazy-load the face-api.js library and model weights only when detection is initiated.
4. WHEN the App component unmounts, THE App SHALL clear all timers and cancel all pending network requests to prevent memory leaks.
5. THE App SHALL be fully functional and visually consistent on viewport widths from 375px (mobile) to 1920px (desktop).

---

### Requirement 11: Error Handling

**User Story:** As a user, I want clear feedback when something goes wrong, so that I understand what happened and how to recover.

#### Acceptance Criteria

1. IF the browser does not support the `getUserMedia` API, THEN THE App SHALL display a message stating that the browser is not supported and recommend a supported browser.
2. IF the Detection_Engine encounters a runtime error during inference, THEN THE App SHALL log the error to the console and display a non-blocking toast notification without stopping the detection loop.
3. IF the `GET /logs` request fails on load, THEN THE App SHALL display an inline error message within the history panel and provide a retry button.
4. THE App SHALL validate that the `emotion` field in each API response is one of the known emotion labels before rendering it in the UI.

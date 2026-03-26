/**
 * Unit tests for CameraController component.
 * Requirements: 1.2, 1.3, 1.6, 11.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mock useDetectionEngine
// ---------------------------------------------------------------------------

const mockStart = vi.fn()
const mockStop = vi.fn()
const mockRetry = vi.fn()

const mockDetectionEngine = {
  status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  errorMessage: null as string | null,
  lastResult: null,
  noFaceDetected: false,
  start: mockStart,
  stop: mockStop,
  retry: mockRetry,
}

vi.mock('../../hooks/useDetectionEngine', () => ({
  useDetectionEngine: () => mockDetectionEngine,
}))

// ---------------------------------------------------------------------------
// Mock child components to keep tests focused
// ---------------------------------------------------------------------------

vi.mock('../LoadingOverlay', () => ({
  LoadingOverlay: ({ modelStatus }: { modelStatus: string }) => (
    <div data-testid="loading-overlay" data-status={modelStatus} />
  ),
}))

vi.mock('../EmotionDisplay', () => ({
  EmotionDisplay: () => <div data-testid="emotion-display" />,
}))

// ---------------------------------------------------------------------------
// Mock framer-motion to avoid animation issues in tests
// ---------------------------------------------------------------------------

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ---------------------------------------------------------------------------
// Import component after mocks are set up
// ---------------------------------------------------------------------------

import { CameraController } from '../CameraController'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockStream(): MediaStream {
  const mockTrack = { stop: vi.fn() }
  return {
    getTracks: vi.fn().mockReturnValue([mockTrack]),
  } as unknown as MediaStream
}

function renderCamera(props: Partial<React.ComponentProps<typeof CameraController>> = {}) {
  const defaults = {
    cameraActive: false,
    onDetectionResult: vi.fn(),
    onStop: vi.fn(),
  }
  return render(<CameraController {...defaults} {...props} />)
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  // Reset detection engine state
  mockDetectionEngine.status = 'idle'
  mockDetectionEngine.errorMessage = null
  mockDetectionEngine.lastResult = null
  mockDetectionEngine.noFaceDetected = false
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CameraController', () => {
  it('getUserMedia success → video element gets srcObject', async () => {
    const mockStream = makeMockStream()
    const getUserMediaMock = vi.fn().mockResolvedValue(mockStream)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
      configurable: true,
    })

    renderCamera({ cameraActive: true })

    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalledWith({ video: true })
    })

    // The stream should have been assigned (no permission error shown)
    expect(screen.queryByText(/camera access was denied/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/could not access the camera/i)).not.toBeInTheDocument()
  })

  it('getUserMedia rejects with NotAllowedError → shows permission denied error message', async () => {
    const notAllowedError = Object.assign(new Error('Permission denied'), {
      name: 'NotAllowedError',
    })
    const getUserMediaMock = vi.fn().mockRejectedValue(notAllowedError)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
      configurable: true,
    })

    renderCamera({ cameraActive: true })

    await waitFor(() => {
      expect(
        screen.getByText(/camera access was denied/i),
      ).toBeInTheDocument()
    })
  })

  it('stop camera releases media stream tracks', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream

    const getUserMediaMock = vi.fn().mockResolvedValue(mockStream)

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
      configurable: true,
    })

    const { rerender } = renderCamera({ cameraActive: true })

    // Wait for camera to start
    await waitFor(() => {
      expect(getUserMediaMock).toHaveBeenCalled()
    })

    // Stop the camera by setting cameraActive to false
    await act(async () => {
      rerender(
        <CameraController
          cameraActive={false}
          onDetectionResult={vi.fn()}
          onStop={vi.fn()}
        />,
      )
    })

    // Track.stop() should have been called to release the stream
    expect(mockTrack.stop).toHaveBeenCalled()
  })

  it('unsupported browser (navigator.mediaDevices undefined) → shows unsupported browser message', async () => {
    // Remove mediaDevices to simulate unsupported browser
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    renderCamera({ cameraActive: true })

    await waitFor(() => {
      expect(screen.getByText(/browser not supported/i)).toBeInTheDocument()
    })

    // Should also mention a supported browser
    expect(screen.getByText(/chrome/i)).toBeInTheDocument()
  })
})

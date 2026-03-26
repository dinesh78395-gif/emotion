/**
 * Unit tests for useDetectionEngine hook.
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVideoEl(): HTMLVideoElement {
  return document.createElement('video')
}

function makeCanvasEl(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  canvas.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
  }) as unknown as HTMLCanvasElement['getContext']
  return canvas
}

// ---------------------------------------------------------------------------
// Each test resets the module registry so the module-level singletons
// (faceapiModule, modelsLoaded) are fresh.
// ---------------------------------------------------------------------------

let mockLoadFromUri: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  mockLoadFromUri = vi.fn().mockResolvedValue(undefined)

  vi.doMock('@vladmandic/face-api', () => ({
    nets: {
      ssdMobilenetv1: { loadFromUri: mockLoadFromUri },
      faceLandmark68Net: { loadFromUri: mockLoadFromUri },
      faceExpressionNet: { loadFromUri: mockLoadFromUri },
    },
    detectSingleFace: vi.fn(),
  }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.doUnmock('@vladmandic/face-api')
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useDetectionEngine', () => {
  it('initial status is idle', async () => {
    const { useDetectionEngine } = await import('../useDetectionEngine')
    const { result } = renderHook(() => useDetectionEngine())

    expect(result.current.status).toBe('idle')
    expect(result.current.errorMessage).toBeNull()
    expect(result.current.lastResult).toBeNull()
  })

  it('calling start() transitions status idle → loading → ready', async () => {
    const { useDetectionEngine } = await import('../useDetectionEngine')
    const { result } = renderHook(() => useDetectionEngine())

    expect(result.current.status).toBe('idle')

    const videoEl = makeVideoEl()
    const canvasEl = makeCanvasEl()

    act(() => {
      result.current.start(videoEl, canvasEl)
    })

    // Should immediately move to loading
    expect(result.current.status).toBe('loading')

    // Wait for models to finish loading → ready
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.errorMessage).toBeNull()
  })

  it('model load failure sets status to error and errorMessage is set', async () => {
    // Make the first loadFromUri call reject
    mockLoadFromUri.mockRejectedValue(new Error('Network error'))

    const { useDetectionEngine } = await import('../useDetectionEngine')
    const { result } = renderHook(() => useDetectionEngine())

    const videoEl = makeVideoEl()
    const canvasEl = makeCanvasEl()

    act(() => {
      result.current.start(videoEl, canvasEl)
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.errorMessage).toBeTruthy()
    expect(typeof result.current.errorMessage).toBe('string')
  })

  it('face-api is NOT imported before start() is called (lazy-load)', async () => {
    const { useDetectionEngine } = await import('../useDetectionEngine')

    // Simply rendering the hook must NOT trigger any model loading
    renderHook(() => useDetectionEngine())

    // None of the model loaders should have been called yet
    expect(mockLoadFromUri).not.toHaveBeenCalled()
  })

  it('stop() clears the interval', async () => {
    // Track setInterval / clearInterval calls using real timers
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { useDetectionEngine } = await import('../useDetectionEngine')
    const { result } = renderHook(() => useDetectionEngine())

    const videoEl = makeVideoEl()
    const canvasEl = makeCanvasEl()

    // Start the hook and wait for it to reach 'ready'
    await act(async () => {
      result.current.start(videoEl, canvasEl)
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    // Capture the interval ID that was registered
    const intervalId = setIntervalSpy.mock.results[0]?.value

    // Now stop — should call clearInterval with the registered interval ID
    act(() => {
      result.current.stop()
    })

    expect(clearIntervalSpy).toHaveBeenCalled()
    if (intervalId !== undefined) {
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId)
    }
  }, 10000)
})

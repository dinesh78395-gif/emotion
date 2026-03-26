/**
 * Service for posting emotion detection results and fetching logs from the API.
 * Requirements: 4.1, 4.6
 */

import type { DetectionResult, EmotionLog } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * POST a detection result to /log.
 * On failure, silently retries once after 1 second.
 * If the retry also fails, logs a console warning — does NOT throw.
 */
export async function postLog(result: DetectionResult): Promise<void> {
  const body = JSON.stringify({
    emotion: result.emotion,
    confidence: result.confidence,
    timestamp: new Date().toISOString(),
  })

  const doPost = () =>
    fetch(`${API_BASE}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

  try {
    const res = await doPost()
    if (res.ok) return
    throw new Error(`POST /log failed with status ${res.status}`)
  } catch {
    // First attempt failed — retry once after 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000))
    try {
      const res = await doPost()
      if (res.ok) return
      throw new Error(`POST /log retry failed with status ${res.status}`)
    } catch (retryErr) {
      console.warn('postLog: retry failed, giving up.', retryErr)
    }
  }
}

/**
 * GET all emotion logs from /logs.
 * Throws an error if the response is not 2xx.
 */
export async function fetchLogs(): Promise<EmotionLog[]> {
  const res = await fetch(`${API_BASE}/logs`)
  if (!res.ok) {
    throw new Error(`GET /logs failed with status ${res.status}`)
  }
  return res.json() as Promise<EmotionLog[]>
}

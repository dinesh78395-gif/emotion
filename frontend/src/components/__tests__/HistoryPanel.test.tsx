/**
 * Unit tests for HistoryPanel component.
 * Requirements: 4.5, 5.1, 5.3, 11.3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HistoryPanel } from '../HistoryPanel'
import type { EmotionLog } from '../../types'

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
// Helpers
// ---------------------------------------------------------------------------

function makeLog(overrides: Partial<EmotionLog> = {}): EmotionLog {
  return {
    _id: Math.random().toString(36).slice(2),
    emotion: 'happy',
    confidence: 0.85,
    timestamp: '2024-01-15T10:30:00.000Z',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HistoryPanel', () => {
  it('renders log entries with emotion label, confidence %, and timestamp', () => {
    const logs: EmotionLog[] = [
      makeLog({ emotion: 'happy', confidence: 0.92, timestamp: '2024-01-15T10:30:00.000Z' }),
      makeLog({ emotion: 'sad', confidence: 0.75, timestamp: '2024-01-15T10:29:00.000Z' }),
    ]

    render(<HistoryPanel logs={logs} logsError={null} onRetry={vi.fn()} />)

    // Emotion labels
    expect(screen.getByText('happy')).toBeInTheDocument()
    expect(screen.getByText('sad')).toBeInTheDocument()

    // Confidence percentages (Math.round(0.92 * 100) = 92, Math.round(0.75 * 100) = 75)
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()

    // Timestamps should be rendered (formatted, so just check they exist)
    // The component uses toLocaleString which varies by environment, so check count
    const allText = screen.getAllByText(/jan/i)
    expect(allText.length).toBeGreaterThanOrEqual(1)
  })

  it('shows inline error message when logsError is set', () => {
    render(
      <HistoryPanel
        logs={[]}
        logsError="Failed to load history. Please try again."
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('Failed to load history. Please try again.')).toBeInTheDocument()
  })

  it('shows retry button when logsError is set, clicking it calls onRetry', () => {
    const onRetry = vi.fn()

    render(
      <HistoryPanel
        logs={[]}
        logsError="Network error"
        onRetry={onRetry}
      />,
    )

    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders empty state when logs array is empty', () => {
    render(<HistoryPanel logs={[]} logsError={null} onRetry={vi.fn()} />)

    expect(screen.getByText(/no history yet/i)).toBeInTheDocument()
  })
})

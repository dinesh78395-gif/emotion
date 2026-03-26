/**
 * Unit tests for AnalyticsPanel component.
 * Requirements: 6.1, 6.2
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AnalyticsPanel } from '../AnalyticsPanel'
import type { EmotionLabel } from '../../types'
import { EMOTION_LABELS } from '../../utils/emotionUtils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeZeroCounts(): Record<EmotionLabel, number> {
  return Object.fromEntries(EMOTION_LABELS.map((e) => [e, 0])) as Record<EmotionLabel, number>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsPanel', () => {
  it('renders all seven emotion labels', () => {
    const sessionCounts = makeZeroCounts()

    render(<AnalyticsPanel sessionCounts={sessionCounts} />)

    for (const label of EMOTION_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('counts update reactively — re-render with new sessionCounts shows updated values', () => {
    const initialCounts = makeZeroCounts()

    const { rerender } = render(<AnalyticsPanel sessionCounts={initialCounts} />)

    // Initially all counts are 0
    const zeroCounts = screen.getAllByText('0')
    expect(zeroCounts.length).toBe(EMOTION_LABELS.length)

    // Update counts
    const updatedCounts: Record<EmotionLabel, number> = {
      ...makeZeroCounts(),
      happy: 5,
      sad: 3,
    }

    rerender(<AnalyticsPanel sessionCounts={updatedCounts} />)

    // Updated values should be visible
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // The aria-label on the progressbar should reflect the count
    const happyBar = screen.getByRole('progressbar', { name: /happy: 5/i })
    expect(happyBar).toBeInTheDocument()
    expect(happyBar).toHaveAttribute('aria-valuenow', '5')
  })
})

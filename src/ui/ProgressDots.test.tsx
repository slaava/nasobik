// src/ui/ProgressDots.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressDots } from './ProgressDots'

describe('ProgressDots', () => {
  it('renders total dots with the first `filled` solid', () => {
    const { container } = render(<ProgressDots total={5} filled={2} label="pokrok" />)
    const dots = container.querySelectorAll('[data-dot]')
    expect(dots).toHaveLength(5)
    expect(Array.from(dots).map(d => d.getAttribute('data-dot'))).toEqual(['on', 'on', 'off', 'off', 'off'])
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('pokrok: 2 z 5')
  })
  it('clamps filled into [0, total]', () => {
    const { container } = render(<ProgressDots total={3} filled={7} />)
    expect(container.querySelectorAll('[data-dot="on"]')).toHaveLength(3)
  })
})

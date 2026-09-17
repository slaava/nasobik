import { PHRASES } from '../scenes/cat/phrases'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionSummary } from './SessionSummary'

describe('SessionSummary', () => {
  it('shows correct and wrong counts', () => {
    render(
      <SessionSummary
        correctCount={18}
        wrongCount={2}
        onPlayAgain={() => {}}
        onDone={() => {}}
      />,
    )
    expect(screen.getByText(/18/)).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('calls onPlayAgain', async () => {
    const onPlayAgain = vi.fn()
    render(
      <SessionSummary
        correctCount={20}
        wrongCount={0}
        onPlayAgain={onPlayAgain}
        onDone={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /hrát znovu/i }))
    expect(onPlayAgain).toHaveBeenCalled()
  })
})

it('shows a happy cat and a finish phrase; mixed results pick the mixed list', () => {
  render(<SessionSummary correctCount={20} wrongCount={0} onPlayAgain={() => {}} onDone={() => {}} />)
  expect(document.querySelector('svg[data-mood="happy"]')).not.toBeNull()
  expect(screen.getByText(PHRASES['finish-good'][20 % PHRASES['finish-good'].length]!)).toBeInTheDocument()
  cleanup()
  render(<SessionSummary correctCount={20} wrongCount={6} onPlayAgain={() => {}} onDone={() => {}} />)
  expect(document.querySelector('svg[data-mood="neutral"]')).not.toBeNull()
})

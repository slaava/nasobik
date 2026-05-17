import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentGate } from './ParentGate'

describe('ParentGate', () => {
  it('unlocks on correct answer', async () => {
    const onUnlock = vi.fn()
    render(<ParentGate onUnlock={onUnlock} onCancel={() => {}} />)
    const heading = screen.getByRole('heading', { level: 1 })
    const m = heading.textContent!.match(/(\d+)\s*\+\s*(\d+)/)!
    const sum = Number(m[1]) + Number(m[2])
    await userEvent.type(screen.getByRole('textbox'), String(sum))
    await userEvent.click(screen.getByRole('button', { name: /pokračovat/i }))
    expect(onUnlock).toHaveBeenCalled()
  })

  it('does not unlock on wrong answer', async () => {
    const onUnlock = vi.fn()
    render(<ParentGate onUnlock={onUnlock} onCancel={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), '0')
    await userEvent.click(screen.getByRole('button', { name: /pokračovat/i }))
    expect(onUnlock).not.toHaveBeenCalled()
  })

  it('cancel calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<ParentGate onUnlock={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /zpět/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})

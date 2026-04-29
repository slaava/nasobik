import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Numpad } from './Numpad'

describe('Numpad', () => {
  it('calls onDigit when a digit is clicked', async () => {
    const onDigit = vi.fn()
    render(<Numpad onDigit={onDigit} onClear={() => {}} onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '7' }))
    expect(onDigit).toHaveBeenCalledWith(7)
  })

  it('calls onClear when clear is clicked', async () => {
    const onClear = vi.fn()
    render(<Numpad onDigit={() => {}} onClear={onClear} onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /smazat/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('calls onSubmit when enter is clicked', async () => {
    const onSubmit = vi.fn()
    render(<Numpad onDigit={() => {}} onClear={() => {}} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(onSubmit).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentSettings } from './ParentSettings'

describe('ParentSettings', () => {
  it('shows all 10 table checkboxes with the right initial state', () => {
    render(
      <ParentSettings
        unlockedTables={[1, 2, 5]}
        onToggleTable={() => {}}
        onBack={() => {}}
      />,
    )
    for (let n = 1; n <= 10; n++) {
      const cb = screen.getByLabelText(`Řada ${n}`) as HTMLInputElement
      expect(cb.checked).toBe([1, 2, 5].includes(n))
    }
  })

  it('calls onToggleTable with the right number on toggle', async () => {
    const onToggleTable = vi.fn()
    render(
      <ParentSettings
        unlockedTables={[2]}
        onToggleTable={onToggleTable}
        onBack={() => {}}
      />,
    )
    await userEvent.click(screen.getByLabelText('Řada 7'))
    expect(onToggleTable).toHaveBeenCalledWith(7)
  })

  it('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(
      <ParentSettings
        unlockedTables={[]}
        onToggleTable={() => {}}
        onBack={onBack}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /zpět/i }))
    expect(onBack).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentSettings } from './ParentSettings'

const baseProps = {
  name: 'Anička',
  unlockedTables: [1, 2, 5],
  divisionEnabled: false,
  cards: [],
  sessions: [],
  onRename: () => {},
  onToggleTable: () => {},
  onToggleDivision: () => {},
  onBack: () => {},
}

describe('ParentSettings', () => {
  it('shows the child name in the input', () => {
    render(<ParentSettings {...baseProps} />)
    expect((screen.getByLabelText('Jméno dítěte') as HTMLInputElement).value).toBe('Anička')
  })

  it('calls onRename when the name input is committed (blur)', async () => {
    const onRename = vi.fn()
    render(<ParentSettings {...baseProps} onRename={onRename} />)
    const input = screen.getByLabelText('Jméno dítěte')
    await userEvent.clear(input)
    await userEvent.type(input, 'Tomáš')
    input.blur()
    expect(onRename).toHaveBeenCalledWith('Tomáš')
  })

  it('shows all 10 table checkboxes with the right initial state', () => {
    render(<ParentSettings {...baseProps} />)
    for (let n = 1; n <= 10; n++) {
      const cb = screen.getByLabelText(`Řada ${n}`) as HTMLInputElement
      expect(cb.checked).toBe([1, 2, 5].includes(n))
    }
  })

  it('calls onToggleTable with the right number on toggle', async () => {
    const onToggleTable = vi.fn()
    render(<ParentSettings {...baseProps} onToggleTable={onToggleTable} />)
    await userEvent.click(screen.getByLabelText('Řada 7'))
    expect(onToggleTable).toHaveBeenCalledWith(7)
  })

  it('renders the heatmap with 100 cells', () => {
    const { container } = render(<ParentSettings {...baseProps} />)
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(100)
  })

  it('shows "zatím nehrálo" today when there are no sessions', () => {
    render(<ParentSettings {...baseProps} />)
    expect(screen.getByText(/zatím nehrálo/)).toBeInTheDocument()
  })

  it('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(<ParentSettings {...baseProps} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /zpět/i }))
    expect(onBack).toHaveBeenCalled()
  })
})

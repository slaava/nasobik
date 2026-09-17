import { cardsForClockLevel } from '../core/clock'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { generateArithCard, formatQuestion } from '../core/cards'
import { ParentSettings } from './ParentSettings'

const baseProps = {
  name: 'Anička',
  unlockedTables: [1, 2, 5],
  divisionEnabled: false,
  arithEnabled: true,
  clockEnabled: true,
  clockLevels: [],
  onToggleClock: () => {},
  onToggleClockLevel: () => {},
  onToggleArith: () => {},
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

describe('arithmetic settings', () => {
  it.each([true, false])('reflects arithEnabled=%s and invokes the toggle', async arithEnabled => {
    const onToggleArith = vi.fn()
    render(<ParentSettings {...baseProps} arithEnabled={arithEnabled} onToggleArith={onToggleArith} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Sčítání a odčítání do 100' })
    expect((checkbox as HTMLInputElement).checked).toBe(arithEnabled)
    await userEvent.click(checkbox)
    expect(onToggleArith).toHaveBeenCalledTimes(1)
  })

  it('lists open mistakes sorted by box then id with progress tooltips', () => {
    const add = { ...generateArithCard('p1', () => 0), box: 2 as const, totalSeen: 3, totalCorrect: 1 }
    const sub = generateArithCard('p1', () => 0.9)
    render(<ParentSettings {...baseProps} cards={[add, sub]} />)
    const heading = screen.getByRole('heading', { name: 'Sčítání a odčítání: kde chybuje' })
    const chips = heading.closest('section')!.querySelectorAll('span')
    expect([...chips].map(chip => chip.textContent)).toEqual([formatQuestion(sub), formatQuestion(add)])
    expect(screen.getByText(formatQuestion(add))).toHaveAttribute('title', 'viděno 3× · správně 1×')
  })

  it('shows the empty mistakes message', () => {
    render(<ParentSettings {...baseProps} />)
    expect(screen.getByText('Zatím žádné rozpracované chyby.')).toBeInTheDocument()
  })
})

it('shows six clock levels, retained mastery and both clock toggles', async () => {
  const cards = cardsForClockLevel('p1', 'hours')
  cards.slice(0, 3).forEach(c => { c.box = 4 })
  const onToggleClock = vi.fn()
  const onToggleClockLevel = vi.fn()
  render(<ParentSettings {...baseProps} cards={cards} onToggleClock={onToggleClock} onToggleClockLevel={onToggleClockLevel} />)
  expect(screen.getAllByRole('checkbox', { name: /^Úroveň / })).toHaveLength(6)
  expect(screen.getByText('3 / 12 umí')).toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Úroveň Půlhodiny'))
  expect(onToggleClockLevel).toHaveBeenCalledWith('half')
  await userEvent.click(screen.getByLabelText('Poznávání hodin'))
  expect(onToggleClock).toHaveBeenCalledTimes(1)
})

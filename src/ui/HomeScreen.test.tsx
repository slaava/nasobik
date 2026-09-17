// src/ui/HomeScreen.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeScreen } from './HomeScreen'
import { freshCard } from '../core/cards'
import type { Card, Profile, Session } from '../core/types'

const profile: Profile = { id: 'p', name: 'Ema', avatar: '', createdAt: 0, unlockedTables: [1], selectedScene: 'cat', divisionEnabled: false, arithEnabled: true, clockEnabled: false, clockLevels: [] }
const c = (op: Card['op'], a: number, b: number, box: Card['box']): Card => ({ ...freshCard('p', op, a, b), box })
const cards = [c('mul', 1, 1, 5), c('mul', 1, 2, 1)]
const today: Session = { id: 's', profileId: 'p', startedAt: Date.now() - 1000, endedAt: Date.now(), answers: [{ a: 1, b: 1, correct: true, rt: 1 }, { a: 1, b: 2, correct: false, rt: 1 }] }

describe('HomeScreen', () => {
  it('greets by name from the cat bubble', () => {
    render(<HomeScreen profile={profile} cards={cards} sessions={[]} onPlay={() => {}} onParent={() => {}} />)
    expect(screen.getByText(/Ema/)).toBeInTheDocument()
    expect(document.querySelector('svg[data-mood="neutral"]')).not.toBeNull()
  })
  it('lists one row per enabled game with mastery dots', () => {
    render(<HomeScreen profile={profile} cards={cards} sessions={[]} onPlay={() => {}} onParent={() => {}} />)
    const tables = screen.getByRole('button', { name: /Násobení/ })
    expect(tables.querySelectorAll('[data-dot]')).toHaveLength(10)
    expect(tables.querySelectorAll('[data-dot="on"]')).toHaveLength(5)
    expect(screen.getByRole('button', { name: /Sčítání a odčítání/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hodiny/ })).toBeNull()
  })
  it('starts the chosen game', async () => {
    const onPlay = vi.fn()
    render(<HomeScreen profile={profile} cards={cards} sessions={[]} onPlay={onPlay} onParent={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Sčítání/ }))
    expect(onPlay).toHaveBeenCalledWith('arith')
  })
  it('shows today summary', () => {
    render(<HomeScreen profile={profile} cards={cards} sessions={[today]} onPlay={() => {}} onParent={() => {}} />)
    expect(screen.getByText('Dnes: 1 hra · 1 správně')).toBeInTheDocument()
  })
})

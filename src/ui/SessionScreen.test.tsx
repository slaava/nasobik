import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionScreen } from './SessionScreen'
import { generateCardsForTables, generateArithCard } from '../core/cards'
import App from '../App'
import { bootstrapDefaultProfile } from '../bootstrap'
import { openDb, putProfile, putCards, getCardsForProfile, getSessionsForProfile } from '../db/repo'
import { beeScene } from '../scenes/bee'

describe('SessionScreen', () => {
  it('shows the first question on mount', () => {
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        mode="tables"
        cards={cards}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    expect(screen.getByText(/×/)).toBeInTheDocument()
  })

  it('typing the correct answer via numpad advances the hive', async () => {
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        mode="tables"
        cards={cards}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*×\s*(\d+)/)!
    const a = Number(match[1])
    const b = Number(match[2])
    const product = a * b
    for (const ch of String(product)) {
      await userEvent.click(screen.getByRole('button', { name: ch }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('calls onFinish when goal reached', async () => {
    const onFinish = vi.fn()
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        mode="tables"
        cards={cards}
        goalCount={1}
        scene={beeScene}
        onFinish={onFinish}
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*×\s*(\d+)/)!
    const product = Number(match[1]) * Number(match[2])
    for (const ch of String(product)) {
      await userEvent.click(screen.getByRole('button', { name: ch }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(onFinish).toHaveBeenCalled()
  })
})

describe('SessionScreen arithmetic mode', () => {
  it('generates a question for an empty deck and a correct answer advances the hive', async () => {
    render(
      <SessionScreen
        mode="arith"
        profileId="p1"
        cards={[]}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/[+−]/)
    expect(screen.queryByText('Není co procvičovat.')).not.toBeInTheDocument()
    const match = heading.textContent!.match(/(\d+)\s*([+−])\s*(\d+)/)!
    const a = Number(match[1])
    const b = Number(match[3])
    const answer = match[2] === '+' ? a + b : a - b
    for (const digit of String(answer)) {
      await userEvent.click(screen.getByRole('button', { name: digit }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('calls onFinish exactly once even when finished props change', async () => {
    const onFinish = vi.fn()
    const props = { mode: 'arith' as const, cards: [], goalCount: 1, scene: beeScene, onFinish }
    const { rerender } = render(<SessionScreen {...props} />)
    const match = screen.getByRole('heading').textContent!.match(/(\d+)\s*([+−])\s*(\d+)/)!
    const answer = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3])
    await userEvent.keyboard(String(answer) + '{Enter}')
    expect(onFinish).toHaveBeenCalledTimes(1)
    const replacement = vi.fn()
    rerender(<SessionScreen {...props} cards={[]} onFinish={replacement} />)
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(replacement).not.toHaveBeenCalled()
  })
})

describe('App game selection and session persistence', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('nasobik')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })

  it('offers both games by default', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: /× ÷\s*Násobení/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ −\s*Sčítání a odčítání/ })).toBeInTheDocument()
  })

  it('offers only HRÁT in tables mode when arithmetic is disabled', async () => {
    const { profile } = await bootstrapDefaultProfile()
    const db = await openDb()
    await putProfile(db, { ...profile, arithEnabled: false })
    db.close()
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: 'HRÁT' }))
    expect(screen.getByRole('heading')).toHaveTextContent(/[×÷]/)
  })

  it('deletes mastered mistakes from IndexedDB, preserves tables and replays arithmetic', async () => {
    const { profile, cards } = await bootstrapDefaultProfile()
    const mistake = {
      ...generateArithCard(profile.id, () => 0),
      box: 2 as const,
      exposuresSinceLastSeen: 10,
    }
    const db = await openDb()
    await putCards(db, [mistake])
    db.close()
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: /\+ −\s*Sčítání a odčítání/ }))
    expect(screen.getByRole('heading')).toHaveTextContent('1 + 1')
    for (let i = 0; i < beeScene.goalCount; i++) {
      const match = screen.getByRole('heading').textContent!.match(/(\d+)\s*([+−])\s*(\d+)/)!
      const answer = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3])
      for (const key of String(answer)) fireEvent.keyDown(window, { key })
      fireEvent.keyDown(window, { key: 'Enter' })
    }
    await waitFor(() => expect(screen.getByRole('button', { name: /Hrát znovu/i })).toBeInTheDocument())
    const checkDb = await openDb()
    try {
      const stored = await getCardsForProfile(checkDb, profile.id)
      expect(stored).toHaveLength(cards.length)
      expect(stored).toEqual(expect.arrayContaining(cards))
      expect(await checkDb.get('cards', mistake.id)).toBeUndefined()
      const sessions = await getSessionsForProfile(checkDb, profile.id)
      expect(sessions).toHaveLength(1)
      expect(sessions[0].answers).toHaveLength(beeScene.goalCount)
      expect(sessions[0].answers.every(a => a.op === 'add' || a.op === 'sub')).toBe(true)
    } finally {
      checkDb.close()
    }
    await userEvent.click(screen.getByRole('button', { name: /Hrát znovu/i }))
    expect(screen.getByRole('heading')).toHaveTextContent(/[+−]/)
  })
})

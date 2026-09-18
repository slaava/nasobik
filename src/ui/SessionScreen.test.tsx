import { cardsForClockLevel, formatTime } from '../core/clock'
import { freshCard } from '../core/cards'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionScreen } from './SessionScreen'
import { generateCardsForTables, generateArithCard } from '../core/cards'
import App from '../App'
import { bootstrapDefaultProfile } from '../bootstrap'
import { openDb, putProfile, putCards, getCardsForProfile, getSessionsForProfile } from '../db/repo'
import { catScene } from '../scenes/cat'

describe('SessionScreen', () => {
  it('shows the first question on mount', () => {
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        mode="tables"
        cards={cards}
        goalCount={3}
        scene={catScene}
        onFinish={() => {}}
      />,
    )
    expect(screen.getByText(/×/)).toBeInTheDocument()
  })

  it('typing the correct answer via numpad advances the dots', async () => {
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        mode="tables"
        cards={cards}
        goalCount={3}
        scene={catScene}
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
    expect(document.querySelectorAll('[data-dot="on"]')).toHaveLength(1)
  })

  it('calls onFinish when goal reached', async () => {
    const onFinish = vi.fn()
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        mode="tables"
        cards={cards}
        goalCount={1}
        scene={catScene}
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
  it('generates a question for an empty deck and a correct answer advances the dots', async () => {
    render(
      <SessionScreen
        mode="arith"
        profileId="p1"
        cards={[]}
        goalCount={3}
        scene={catScene}
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
    expect(document.querySelectorAll('[data-dot="on"]')).toHaveLength(1)
  })

  it('calls onFinish exactly once even when finished props change', async () => {
    const onFinish = vi.fn()
    const props = { mode: 'arith' as const, cards: [], goalCount: 1, scene: catScene, onFinish }
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

  it('offers three games by default', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: /× ÷\s*Násobení/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ −\s*Sčítání a odčítání/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Hodiny/ }))
    expect(screen.getByTestId('clock-face')).toBeInTheDocument()
  })

  it('offers only the tables row when arithmetic and clocks are disabled', async () => {
    const { profile } = await bootstrapDefaultProfile()
    const db = await openDb()
    await putProfile(db, { ...profile, arithEnabled: false, clockEnabled: false })
    db.close()
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: /Násobení/ }))
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
    for (let i = 0; i < catScene.goalCount; i++) {
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
      expect(sessions[0].answers).toHaveLength(catScene.goalCount)
      expect(sessions[0].answers.every(a => a.op === 'add' || a.op === 'sub')).toBe(true)
    } finally {
      checkDb.close()
    }
    await userEvent.click(screen.getByRole('button', { name: /Hrát znovu/i }))
    expect(screen.getByRole('heading')).toHaveTextContent(/[+−]/)
  })
})

describe('SessionScreen clocks', () => {
  const props = { mode: 'clock' as const, goalCount: 3, scene: catScene, onFinish: () => {} }

  it('renders hours choices and advances the dots on a correct tap', async () => {
    render(<SessionScreen {...props} cards={cardsForClockLevel('p1', 'hours')} />)
    const hour = Number(screen.getByTestId('clock-face').getAttribute('data-hour'))
    expect(screen.getAllByRole('button', { name: /^\d+:\d\d$/ })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /hotovo/i })).not.toBeInTheDocument()
    await userEvent.keyboard('123{Enter}')
    expect(screen.getByTestId('clock-face')).toHaveAttribute('data-hour', String(hour))
    await userEvent.click(screen.getByRole('button', { name: formatTime(hour * 100) }))
    expect(document.querySelectorAll('[data-dot="on"]')).toHaveLength(1)
  })

  it('keeps identical choices during correction and requires the correct tap', async () => {
    render(<SessionScreen {...props} cards={cardsForClockLevel('p1', 'hours')} />)
    const hour = Number(screen.getByTestId('clock-face').getAttribute('data-hour'))
    const options = screen.getAllByRole('button', { name: /^\d+:\d\d$/ })
    const labels = options.map(b => b.textContent)
    const wrong = options.find(b => b.textContent !== formatTime(hour * 100))!
    await userEvent.click(wrong)
    expect(screen.getByText('Klepni na správnou odpověď.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^\d+:\d\d$/ }).map(b => b.textContent)).toEqual(labels)
    await userEvent.click(wrong)
    expect(screen.getByText('Klepni na správnou odpověď.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: formatTime(hour * 100) }))
    expect(screen.queryByText('Klepni na správnou odpověď.')).not.toBeInTheDocument()
    expect(screen.getByTestId('clock-face')).not.toHaveAttribute('data-hour', String(hour))
  })

  it('formats keypad input and accepts a 24h reading for a five-minute card', async () => {
    render(<SessionScreen {...props} cards={[freshCard('p1', 'clk-read', 7, 35)]} />)
    await userEvent.keyboard('730')
    expect(screen.getByTestId('answer-input')).toHaveTextContent('7:30')
    await userEvent.keyboard('{Backspace}{Backspace}{Backspace}1935{Enter}')
    expect(document.querySelectorAll('[data-dot="on"]')).toHaveLength(1)
  })

  it('accepts 1930 for a mastered analog 7:30 but rejects it for 24-to-12 conversion', async () => {
    const { unmount } = render(<SessionScreen {...props} cards={[{ ...freshCard('p1', 'clk-read', 7, 30), box: 3 }]} />)
    await userEvent.keyboard('1930{Enter}')
    expect(document.querySelectorAll('[data-dot="on"]')).toHaveLength(1)
    unmount()
    render(<SessionScreen {...props} cards={[freshCard('p1', 'clk-24to12', 19, 30)]} />)
    expect(screen.getByTestId('digital-display')).toHaveTextContent('19:30')
    await userEvent.keyboard('1930{Enter}')
    expect(screen.getByText('Správně je 7:30.')).toBeInTheDocument()
    expect(screen.getByText('Napiš ten čas.')).toBeInTheDocument()
    await userEvent.keyboard('730{Enter}')
    expect(screen.queryByText('Napiš ten čas.')).not.toBeInTheDocument()
  })

  it('asks phrases using only the three answer clocks', () => {
    render(<SessionScreen {...props} cards={[freshCard('p1', 'clk-phrase', 7, 30)]} />)
    expect(screen.getByRole('heading')).toHaveTextContent('půl osmé')
    expect(screen.getAllByRole('img', { name: /^hodiny / })).toHaveLength(3)
    for (const face of screen.getAllByTestId('clock-face')) expect(face.closest('button')).not.toBeNull()
    expect(screen.getByRole('button', { name: '7:30' })).toBeInTheDocument()
  })

  it('explains an empty clock deck', () => {
    render(<SessionScreen {...props} cards={[]} />)
    expect(screen.getByText(/úroveň hodin/)).toBeInTheDocument()
  })
})

it('returns a missed mastered clock to choices even in a one-card deck', async () => {
  render(<SessionScreen mode="clock" goalCount={3} scene={catScene} onFinish={() => {}} cards={[{ ...freshCard('p1', 'clk-read', 7, 30), box: 3 }]} />)
  await userEvent.keyboard('830{Enter}')
  await userEvent.keyboard('730{Enter}')
  expect(screen.getAllByRole('button', { name: /^\d+:\d\d$/ })).toHaveLength(3)
  await userEvent.click(screen.getByRole('button', { name: '7:30' }))
  expect(document.querySelectorAll('[data-dot="on"]')).toHaveLength(1)
})

it('shows the game name and 20 session dots in the header', () => {
  render(<SessionScreen cards={generateCardsForTables('p1', [2], false)} goalCount={20} scene={catScene} mode="tables" onFinish={() => {}} />)
  expect(screen.getByText('Násobení')).toBeInTheDocument()
  expect(document.querySelectorAll('[data-dot]')).toHaveLength(20)
  expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull()
})

it('passes "dunno" to the scene when the child gives up', async () => {
  render(<SessionScreen cards={generateCardsForTables('p1', [2], false)} goalCount={20} scene={catScene} mode="tables" onFinish={() => {}} />)
  await userEvent.click(screen.getByText('Já nevím'))
  expect(document.querySelector('svg[data-mood="surprised"]')).not.toBeNull()
})

describe('leaving a session early', () => {
  it('shows a home button in the header that calls onExit, and hides it without onExit', async () => {
    const onExit = vi.fn()
    const { unmount } = render(<SessionScreen cards={generateCardsForTables('p1', [2], false)} goalCount={20} scene={catScene} mode="tables" onFinish={() => {}} onExit={onExit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Domů' }))
    expect(onExit).toHaveBeenCalledTimes(1)
    unmount()
    render(<SessionScreen cards={generateCardsForTables('p1', [2], false)} goalCount={20} scene={catScene} mode="tables" onFinish={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Domů' })).toBeNull()
  })

  it('App returns home without persisting the abandoned session or its answers', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('nasobik')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    const { profile, cards } = await bootstrapDefaultProfile()
    render(<App />)
    await userEvent.click(await screen.findByRole('button', { name: /Násobení/ }))
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*([×÷])\s*(\d+)/)!
    const answer = match[2] === '×' ? Number(match[1]) * Number(match[3]) : Number(match[1]) / Number(match[3])
    await userEvent.keyboard(String(answer) + '{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Domů' }))
    expect(await screen.findByRole('button', { name: /Násobení/ })).toBeInTheDocument()
    const db = await openDb()
    try {
      expect(await getSessionsForProfile(db, profile.id)).toHaveLength(0)
      expect(await getCardsForProfile(db, profile.id)).toEqual(expect.arrayContaining(cards))
      expect((await getCardsForProfile(db, profile.id)).every(c => c.box === 1)).toBe(true)
    } finally {
      db.close()
    }
  })
})

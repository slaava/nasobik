import { describe, it, expect } from 'vitest'
import { generateCardsForTables, expectedAnswer, formatQuestion, cardId } from './cards'
import type { Card } from './types'

const mk = (overrides: Partial<Card>): Card => ({
  id: 'p1:3x7',
  profileId: 'p1',
  op: 'mul',
  a: 3,
  b: 7,
  box: 1,
  exposuresSinceLastSeen: 0,
  sessionsSinceLastSeen: 0,
  lastRT: null,
  totalSeen: 0,
  totalCorrect: 0,
  ...overrides,
})

describe('generateCardsForTables (mul only)', () => {
  it('generates 100 mul cards for tables 1-10', () => {
    const cards = generateCardsForTables('p1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], false)
    expect(cards).toHaveLength(100)
    expect(cards.every(c => c.op === 'mul')).toBe(true)
  })

  it('treats 3x7 and 7x3 as separate cards', () => {
    const cards = generateCardsForTables('p1', [3, 7], false)
    const ids = cards.map(c => c.id)
    expect(ids).toContain('p1:3x7')
    expect(ids).toContain('p1:7x3')
  })

  it('initializes every card in box 1', () => {
    const cards = generateCardsForTables('p1', [2], false)
    expect(cards.every(c => c.box === 1)).toBe(true)
  })

  it('only generates cards where the first factor is in unlocked tables', () => {
    const cards = generateCardsForTables('p1', [2], false)
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.a === 2)).toBe(true)
  })
})

describe('generateCardsForTables (with division)', () => {
  it('doubles the card count when division is enabled', () => {
    const cards = generateCardsForTables('p1', [2, 5], true)
    expect(cards).toHaveLength(40)
    expect(cards.filter(c => c.op === 'mul')).toHaveLength(20)
    expect(cards.filter(c => c.op === 'div')).toHaveLength(20)
  })

  it('gives mul and div distinct ids for the same (a, b)', () => {
    const cards = generateCardsForTables('p1', [3], true)
    const mul = cards.find(c => c.op === 'mul' && c.a === 3 && c.b === 7)!
    const div = cards.find(c => c.op === 'div' && c.a === 3 && c.b === 7)!
    expect(mul.id).toBe('p1:3x7')
    expect(div.id).toBe('p1:3x7:div')
  })
})

describe('expectedAnswer', () => {
  it('returns a*b for mul', () => {
    expect(expectedAnswer(mk({ op: 'mul', a: 6, b: 7 }))).toBe(42)
  })
  it('returns b for div (since the question is a*b ÷ a)', () => {
    expect(expectedAnswer(mk({ op: 'div', a: 6, b: 7 }))).toBe(7)
  })
})

describe('formatQuestion', () => {
  it('renders mul as "a × b"', () => {
    expect(formatQuestion(mk({ op: 'mul', a: 6, b: 7 }))).toBe('6 × 7')
  })
  it('renders div as "(a*b) ÷ a"', () => {
    expect(formatQuestion(mk({ op: 'div', a: 6, b: 7 }))).toBe('42 ÷ 6')
  })
})

describe('cardId', () => {
  it('uses :div suffix for division', () => {
    expect(cardId('p1', 'mul', 4, 9)).toBe('p1:4x9')
    expect(cardId('p1', 'div', 4, 9)).toBe('p1:4x9:div')
  })
})

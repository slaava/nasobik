import { describe, it, expect } from 'vitest'
import { generateCardsForTables } from './cards'

describe('generateCardsForTables', () => {
  it('generates 100 cards for tables 1-10', () => {
    const cards = generateCardsForTables('p1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(cards).toHaveLength(100)
  })

  it('treats 3x7 and 7x3 as separate cards', () => {
    const cards = generateCardsForTables('p1', [3, 7])
    const ids = cards.map(c => c.id)
    expect(ids).toContain('p1:3x7')
    expect(ids).toContain('p1:7x3')
  })

  it('initializes every card in box 1', () => {
    const cards = generateCardsForTables('p1', [2])
    expect(cards.every(c => c.box === 1)).toBe(true)
  })

  it('only generates cards where the first factor is in unlocked tables', () => {
    const cards = generateCardsForTables('p1', [2])
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.a === 2)).toBe(true)
  })
})

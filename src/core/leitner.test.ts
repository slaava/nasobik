import { describe, it, expect } from 'vitest'
import { applyAnswer, bumpExposure, pickNext } from './leitner'
import type { Card } from './types'

const baseCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'p1:3x7',
  profileId: 'p1',
  a: 3,
  b: 7,
  box: 1,
  exposuresSinceLastSeen: 5,
  sessionsSinceLastSeen: 0,
  lastRT: null,
  totalSeen: 0,
  totalCorrect: 0,
  ...overrides,
})

describe('applyAnswer', () => {
  it('correct answer promotes box by 1', () => {
    const updated = applyAnswer(baseCard({ box: 2 }), { correct: true, rt: 2000 })
    expect(updated.box).toBe(3)
  })

  it('correct answer at box 5 stays at 5', () => {
    const updated = applyAnswer(baseCard({ box: 5 }), { correct: true, rt: 1500 })
    expect(updated.box).toBe(5)
  })

  it('wrong answer drops to box 1 regardless of previous box', () => {
    const updated = applyAnswer(baseCard({ box: 4 }), { correct: false, rt: 5000 })
    expect(updated.box).toBe(1)
  })

  it('resets exposuresSinceLastSeen to 0', () => {
    const updated = applyAnswer(baseCard({ exposuresSinceLastSeen: 5 }), { correct: true, rt: 2000 })
    expect(updated.exposuresSinceLastSeen).toBe(0)
  })

  it('resets sessionsSinceLastSeen to 0', () => {
    const updated = applyAnswer(baseCard({ sessionsSinceLastSeen: 3 }), { correct: true, rt: 2000 })
    expect(updated.sessionsSinceLastSeen).toBe(0)
  })

  it('records last RT', () => {
    const updated = applyAnswer(baseCard(), { correct: true, rt: 1234 })
    expect(updated.lastRT).toBe(1234)
  })

  it('increments totalSeen and totalCorrect on correct answer', () => {
    const updated = applyAnswer(baseCard({ totalSeen: 10, totalCorrect: 7 }), { correct: true, rt: 2000 })
    expect(updated.totalSeen).toBe(11)
    expect(updated.totalCorrect).toBe(8)
  })

  it('increments totalSeen but not totalCorrect on wrong answer', () => {
    const updated = applyAnswer(baseCard({ totalSeen: 10, totalCorrect: 7 }), { correct: false, rt: 2000 })
    expect(updated.totalSeen).toBe(11)
    expect(updated.totalCorrect).toBe(7)
  })
})

describe('bumpExposure', () => {
  it('increments exposuresSinceLastSeen', () => {
    const updated = bumpExposure(baseCard({ exposuresSinceLastSeen: 4 }))
    expect(updated.exposuresSinceLastSeen).toBe(5)
  })

  it('does not change box or other fields', () => {
    const card = baseCard({ box: 3, totalSeen: 10 })
    const updated = bumpExposure(card)
    expect(updated.box).toBe(3)
    expect(updated.totalSeen).toBe(10)
  })
})

describe('pickNext', () => {
  it('returns null if no cards', () => {
    expect(pickNext([], { blockingTable: null })).toBeNull()
  })

  it('prefers a ready Box 1 card over a ready Box 2 card', () => {
    const cards = [
      baseCard({ id: 'a', box: 2, exposuresSinceLastSeen: 15 }),
      baseCard({ id: 'b', box: 1, exposuresSinceLastSeen: 5 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('b')
  })

  it('skips a Box 1 card that has not waited 3 exposures yet', () => {
    const cards = [
      baseCard({ id: 'a', box: 1, exposuresSinceLastSeen: 1 }),
      baseCard({ id: 'b', box: 2, exposuresSinceLastSeen: 12 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('b')
  })

  it('within a box, prefers the card with the highest exposuresSinceLastSeen', () => {
    const cards = [
      baseCard({ id: 'a', box: 1, exposuresSinceLastSeen: 4 }),
      baseCard({ id: 'b', box: 1, exposuresSinceLastSeen: 7 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('b')
  })

  it('respects blockingTable: only picks cards where card.a matches', () => {
    const cards = [
      baseCard({ id: 'a', a: 5, b: 3, box: 1, exposuresSinceLastSeen: 10 }),
      baseCard({ id: 'b', a: 7, b: 4, box: 1, exposuresSinceLastSeen: 10 }),
    ]
    expect(pickNext(cards, { blockingTable: 7 })?.id).toBe('b')
  })

  it('returns Box 3 cards in a fresh session (sessionsSinceLastSeen >= 1)', () => {
    const cards = [
      baseCard({ id: 'a', box: 3, sessionsSinceLastSeen: 1, exposuresSinceLastSeen: 0 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('a')
  })

  it('skips Box 4 cards that have not waited enough sessions', () => {
    const cards = [
      baseCard({ id: 'a', box: 4, sessionsSinceLastSeen: 1, exposuresSinceLastSeen: 0 }),
    ]
    expect(pickNext(cards, { blockingTable: null })).toBeNull()
  })

  it('falls back to the lowest-box card if nothing is "ready" (e.g., start of session)', () => {
    const cards = [
      baseCard({ id: 'a', box: 5, exposuresSinceLastSeen: 0 }),
      baseCard({ id: 'b', box: 3, exposuresSinceLastSeen: 0, sessionsSinceLastSeen: 0 }),
      baseCard({ id: 'c', box: 1, exposuresSinceLastSeen: 0 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('c')
  })
})

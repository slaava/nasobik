import { describe, it, expect } from 'vitest'
import { applyAnswer, bumpExposure } from './leitner'
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

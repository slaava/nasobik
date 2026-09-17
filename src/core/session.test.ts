import { cardsForClockLevel } from './clock'
import { describe, it, expect } from 'vitest'
import { sessionReducer, initSessionState } from './session'
import { generateCardsForTables, generateArithCard, expectedAnswer } from './cards'

const cards = () => generateCardsForTables('p1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], false)

describe('sessionReducer', () => {
  it('starts in idle', () => {
    const s = initSessionState()
    expect(s.phase).toBe('idle')
    expect(s.correctCount).toBe(0)
  })

  it('transitions to asking on START and picks a current card', () => {
    const s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    expect(s.phase).toBe('asking')
    expect(s.currentCard).not.toBeNull()
  })

  it('correct answer increments correctCount and picks a new card', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    const first = s.currentCard!
    const correct = first.a * first.b
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: correct, rt: 1500 })
    expect(s.phase).toBe('asking')
    expect(s.correctCount).toBe(1)
    expect(s.currentCard?.id).not.toBe(first.id)
  })

  it('wrong answer transitions to showing-correction with the original card', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    const first = s.currentCard!
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    expect(s.phase).toBe('showing-correction')
    expect(s.currentCard?.id).toBe(first.id)
    expect(s.correctCount).toBe(0)
  })

  it('CONFIRM_CORRECTION with matching value advances to next card', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    const first = s.currentCard!
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: first.a * first.b })
    expect(s.phase).toBe('asking')
    expect(s.currentCard?.id).not.toBe(first.id)
  })

  it('CONFIRM_CORRECTION with wrong value stays in showing-correction', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: 99998 })
    expect(s.phase).toBe('showing-correction')
  })

  it('reaches finished when correctCount === goalCount', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 3,
      blockingTable: null,
    })
    while (s.phase === 'asking' && s.currentCard) {
      const c = s.currentCard
      s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: c.a * c.b, rt: 1500 })
    }
    expect(s.phase).toBe('finished')
    expect(s.correctCount).toBe(3)
  })

  it('records every answer in state.answers', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 2,
      blockingTable: null,
    })
    const first = s.currentCard!
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: first.a * first.b })
    expect(s.answers).toHaveLength(1)
    expect(s.answers[0].correct).toBe(false)
  })

  it('hard caps total submitted answers at 35 even if goal not met', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 100, // unreachably high
      blockingTable: null,
    })
    let safety = 0
    while (s.phase !== 'finished' && safety < 200) {
      if (s.phase === 'asking') {
        s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
      } else if (s.phase === 'showing-correction') {
        const c = s.currentCard!
        s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: c.a * c.b })
      }
      safety++
    }
    expect(s.phase).toBe('finished')
    expect(s.answers.length).toBeLessThanOrEqual(35)
  })
})

const seq = (...vals: number[]) => {
  let i = 0
  return () => vals[i++ % vals.length]!
}

const startArith = (
  deck = [] as ReturnType<typeof generateArithCard>[],
  rng = seq(0, 0, 0, 0, 0.1, 0, 0, 0.2, 0, 0, 0.3, 0, 0, 0.4, 0),
) => sessionReducer(initSessionState(), {
  type: 'START', cards: deck, goalCount: 30, blockingTable: null,
  mode: 'arith', profileId: 'p1', rng,
})

const answerCorrectly = (s: ReturnType<typeof initSessionState>) =>
  sessionReducer(s, { type: 'SUBMIT_ANSWER', value: expectedAnswer(s.currentCard!), rt: 1500 })

const missAndConfirm = (s: ReturnType<typeof initSessionState>) => {
  const wrong = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: -1, rt: 2000 })
  expect(wrong.phase).toBe('showing-correction')
  return sessionReducer(wrong, { type: 'CONFIRM_CORRECTION', value: expectedAnswer(s.currentCard!) })
}

describe('arithmetic sessions', () => {
  it('starts an empty deck with a fresh question and does not store correct fresh answers', () => {
    const start = startArith()
    expect(start.phase).toBe('asking')
    expect(start.mode).toBe('arith')
    expect(start.currentCard?.op).toMatch(/add|sub/)
    expect(start.currentCard?.profileId).toBe('p1')
    expect(start.cards).toEqual([])
    const next = answerCorrectly(start)
    expect(next.cards).toEqual([])
    expect(next.correctCount).toBe(1)
    expect(next.answers[0]?.op).toBe(start.currentCard?.op)
  })

  it('stores a miss, asks exactly three other questions, then promotes the retry to box 2', () => {
    let s = startArith()
    const missed = s.currentCard!
    s = missAndConfirm(s)
    expect(s.cards).toEqual([{
      ...missed, box: 1, totalSeen: 1, totalCorrect: 0, lastRT: 0,
    }])
    for (let i = 0; i < 3; i++) {
      expect(s.currentCard?.id).not.toBe(missed.id)
      expect(s.cards[0].exposuresSinceLastSeen).toBe(i)
      s = answerCorrectly(s)
    }
    expect(s.currentCard?.id).toBe(missed.id)
    s = answerCorrectly(s)
    expect(s.cards[0]).toMatchObject({ id: missed.id, box: 2, totalSeen: 2, totalCorrect: 1 })
    expect(s.retiredIds).toEqual([])
    expect(s.answers.every(a => a.op === 'add')).toBe(true)
  })

  it('keeps exposure progress across sessions and retires a ready box 2 mistake', () => {
    const card = { ...generateArithCard('owner', () => 0), box: 2 as const, exposuresSinceLastSeen: 9 }
    let s = startArith([card], seq(0.9, 0.9, 0.9))
    expect(s.profileId).toBe('owner')
    expect(s.currentCard?.profileId).toBe('owner')
    expect(s.currentCard?.id).not.toBe(card.id)
    s = answerCorrectly(s)
    expect(s.currentCard?.id).toBe(card.id)
    s = startArith(s.cards)
    expect(s.currentCard?.id).toBe(card.id)
    s = answerCorrectly(s)
    expect(s.cards).toEqual([])
    expect(s.retiredIds).toEqual([card.id])
    expect(s.currentCard).not.toBeNull()
  })

  it('a wrong returning mistake resets to box 1 and an incorrect correction does nothing', () => {
    const card = { ...generateArithCard('p1', () => 0), box: 2 as const, exposuresSinceLastSeen: 10 }
    const start = startArith([card])
    const wrong = sessionReducer(start, { type: 'SUBMIT_ANSWER', value: -1, rt: 10 })
    expect(sessionReducer(wrong, { type: 'CONFIRM_CORRECTION', value: -1 })).toBe(wrong)
    const s = missAndConfirm(start)
    expect(s.cards[0]).toMatchObject({ box: 1, totalSeen: 1, totalCorrect: 0 })
  })

  it('caps generator collisions at 20 attempts and retains returning card progress', () => {
    const card = { ...generateArithCard('p1', () => 0), box: 2 as const, totalSeen: 5 }
    let draws = 0
    const s = startArith([card], () => { draws++; return 0 })
    expect(draws).toBe(60)
    expect(s.currentCard?.id).toBe(card.id)
    const next = answerCorrectly(s)
    expect(next.cards).toEqual([])
    expect(next.retiredIds).toEqual([card.id])
  })

  it('keeps a new mistake if a retired problem is generated and missed again', () => {
    const card = { ...generateArithCard('p1', () => 0), box: 2 as const, exposuresSinceLastSeen: 10 }
    let s = answerCorrectly(startArith([card], () => 0))
    expect(s.retiredIds).toEqual([card.id])
    s = missAndConfirm(s)
    expect(s.cards[0]).toMatchObject({ id: card.id, box: 1 })
    expect(s.retiredIds).toEqual([])
  })

  it('finishes at the goal or hard cap and records subtraction events', () => {
    const start = startArith([], () => 0.9)
    const goal = answerCorrectly({ ...start, goalCount: 1 })
    expect(goal.phase).toBe('finished')
    expect(goal.answers[0]?.op).toBe('sub')
    const cap = missAndConfirm({ ...start, hardCap: 1 })
    expect(cap.phase).toBe('finished')
    expect(cap.cards).toHaveLength(1)
  })

  it('defaults to tables mode with no retirements and records table operations', () => {
    const start = sessionReducer(initSessionState(), {
      type: 'START', cards: cards(), goalCount: 20, blockingTable: null,
    })
    const next = answerCorrectly(start)
    expect(start.mode).toBe('tables')
    expect(next.retiredIds).toEqual([])
    expect(next.answers[0]?.op).toBe('mul')
  })
})

describe('clock session', () => {
  const start = () => sessionReducer(initSessionState(), {
    type: 'START', cards: cardsForClockLevel('p1', 'hours'), mode: 'clock',
    goalCount: 3, blockingTable: null,
  })

  it.each([false, true])('counts correct readings, alternate=%s', alternate => {
    const state = start()
    expect(state.phase).toBe('asking')
    expect(state.currentCard?.op).toBe('clk-read')
    const a = state.currentCard!.a
    const next = sessionReducer(state, { type: 'SUBMIT_ANSWER', value: (alternate ? (a + 12) % 24 : a) * 100, rt: 100 })
    expect(next.correctCount).toBe(1)
    expect(next.retiredIds).toEqual([])
  })

  it('waits on wrong correction taps and accepts the alternate reading', () => {
    const state = start()
    const wrong = sessionReducer(state, { type: 'SUBMIT_ANSWER', value: -1, rt: 100 })
    expect(wrong.phase).toBe('showing-correction')
    expect(sessionReducer(wrong, { type: 'CONFIRM_CORRECTION', value: -1 })).toBe(wrong)
    const corrected = sessionReducer(wrong, { type: 'CONFIRM_CORRECTION', value: ((state.currentCard!.a + 12) % 24) * 100 })
    expect(corrected.phase).toBe('asking')
    expect(corrected.correctCount).toBe(0)
    expect(corrected.cards.find(c => c.id === state.currentCard!.id)?.box).toBe(1)
  })
})

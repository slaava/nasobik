import { describe, it, expect } from 'vitest'
import { sessionReducer, initSessionState } from './session'
import { generateCardsForTables } from './cards'

const cards = (_n = 100) => generateCardsForTables('p1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

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

import type { Card, AnswerEvent } from './types'
import { applyAnswer, bumpExposure, pickNext } from './leitner'

export type SessionPhase = 'idle' | 'asking' | 'showing-correction' | 'finished'

export type SessionState = {
  phase: SessionPhase
  cards: Card[]
  currentCard: Card | null
  correctCount: number
  goalCount: number
  blockingTable: number | null
  answers: AnswerEvent[]
  hardCap: number
}

export type SessionAction =
  | { type: 'START'; cards: Card[]; goalCount: number; blockingTable: number | null }
  | { type: 'SUBMIT_ANSWER'; value: number; rt: number }
  | { type: 'CONFIRM_CORRECTION'; value: number }
  | { type: 'END' }

export function initSessionState(): SessionState {
  return {
    phase: 'idle',
    cards: [],
    currentCard: null,
    correctCount: 0,
    goalCount: 0,
    blockingTable: null,
    answers: [],
    hardCap: 35,
  }
}

function bumpAllExcept(cards: Card[], excludedId: string): Card[] {
  return cards.map(c => (c.id === excludedId ? c : bumpExposure(c)))
}

function replaceCard(cards: Card[], updated: Card): Card[] {
  return cards.map(c => (c.id === updated.id ? updated : c))
}

// Fisher–Yates shuffle. Used at session START so that tied cards (e.g. all
// fresh Box 1 cards on the first question) get picked in a varied order
// instead of sorting alphabetically by id, which used to put every "10x*"
// card before the rest.
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function pickNextWithFinale(state: SessionState): Card | null {
  const remainingForGoal = state.goalCount - state.correctCount
  if (remainingForGoal === 1) {
    const finale = pickNext(
      state.cards.filter(c => c.box >= 4),
      { blockingTable: state.blockingTable },
    )
    if (finale) return finale
  }
  return pickNext(state.cards, { blockingTable: state.blockingTable })
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START': {
      const shuffled = shuffle(action.cards)
      const next: SessionState = {
        ...initSessionState(),
        phase: 'asking',
        cards: shuffled,
        goalCount: action.goalCount,
        blockingTable: action.blockingTable,
      }
      const first = pickNext(shuffled, { blockingTable: action.blockingTable })
      return { ...next, currentCard: first }
    }

    case 'SUBMIT_ANSWER': {
      if (state.phase !== 'asking' || !state.currentCard) return state
      const card = state.currentCard
      const expected = card.a * card.b
      const correct = action.value === expected
      const event: AnswerEvent = { a: card.a, b: card.b, correct, rt: action.rt }

      if (!correct) {
        return {
          ...state,
          phase: 'showing-correction',
          answers: [...state.answers, event],
        }
      }

      const updated = applyAnswer(card, { correct: true, rt: action.rt })
      const bumped = bumpAllExcept(state.cards, card.id)
      const newCards = replaceCard(bumped, updated)
      const correctCount = state.correctCount + 1
      const answers = [...state.answers, event]

      const reachedGoal = correctCount >= state.goalCount
      const reachedCap = answers.length >= state.hardCap

      if (reachedGoal || reachedCap) {
        return { ...state, cards: newCards, currentCard: null, correctCount, answers, phase: 'finished' }
      }

      const nextStateForPick: SessionState = { ...state, cards: newCards, correctCount }
      const nextCard = pickNextWithFinale(nextStateForPick)
      return {
        ...state,
        cards: newCards,
        currentCard: nextCard,
        correctCount,
        answers,
        phase: nextCard ? 'asking' : 'finished',
      }
    }

    case 'CONFIRM_CORRECTION': {
      if (state.phase !== 'showing-correction' || !state.currentCard) return state
      const card = state.currentCard
      const expected = card.a * card.b
      if (action.value !== expected) return state

      const updated = applyAnswer(card, { correct: false, rt: 0 })
      const bumped = bumpAllExcept(state.cards, card.id)
      const newCards = replaceCard(bumped, updated)
      const reachedCap = state.answers.length >= state.hardCap

      if (reachedCap) {
        return { ...state, cards: newCards, currentCard: null, phase: 'finished' }
      }

      const nextStateForPick: SessionState = { ...state, cards: newCards }
      const nextCard = pickNextWithFinale(nextStateForPick)
      return {
        ...state,
        cards: newCards,
        currentCard: nextCard,
        phase: nextCard ? 'asking' : 'finished',
      }
    }

    case 'END':
      return { ...state, phase: 'finished', currentCard: null }
  }
}

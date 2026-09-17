import type { Card, AnswerEvent, GameMode } from './types'
import { applyAnswer, bumpExposure, pickNext, pickReady } from './leitner'
import { expectedAnswer, generateArithCard } from './cards'

export const ARITH_RETIRE_BOX = 3

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
  mode: GameMode
  profileId: string
  retiredIds: string[]
  rng: () => number
}

export type SessionAction =
  | { type: 'START'; cards: Card[]; goalCount: number; blockingTable: number | null; mode?: GameMode; profileId?: string; rng?: () => number }
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
    mode: 'tables',
    profileId: '',
    retiredIds: [],
    rng: Math.random,
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

function freshArithCard(state: SessionState): Card {
  let card: Card
  for (let attempt = 0; attempt < 20; attempt++) {
    card = generateArithCard(state.profileId, state.rng)
    if (!state.cards.some(c => c.id === card.id)) return card
  }
  return card!
}

function pickNextWithFinale(state: SessionState): Card | null {
  if (state.mode === 'arith') return pickReady(state.cards) ?? freshArithCard(state)
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
      // Advance the cross-session interval on every card. Cards that get
      // touched during THIS session will have sessionsSinceLastSeen reset to
      // 0 by applyAnswer. Cards that don't get touched keep the bumped value
      // — that is how Box 3+ items eventually become session-due again.
      // Without this bump, sessionsSinceLastSeen stays at 0 forever and
      // higher-box cards never re-surface.
      const advanced = action.cards.map(c => ({
        ...c,
        sessionsSinceLastSeen: c.sessionsSinceLastSeen + 1,
      }))
      const shuffled = action.mode === 'arith' ? advanced : shuffle(advanced)
      const next: SessionState = {
        ...initSessionState(),
        phase: 'asking',
        cards: shuffled,
        mode: action.mode ?? 'tables',
        profileId: action.cards[0]?.profileId ?? action.profileId ?? '',
        rng: action.rng ?? Math.random,
        goalCount: action.goalCount,
        blockingTable: action.blockingTable,
      }
      const first = next.mode === 'arith'
        ? pickNextWithFinale(next)
        : pickNext(shuffled, { blockingTable: action.blockingTable })
      return { ...next, currentCard: first }
    }

    case 'SUBMIT_ANSWER': {
      if (state.phase !== 'asking' || !state.currentCard) return state
      const card = state.mode === 'arith'
        ? state.cards.find(c => c.id === state.currentCard!.id) ?? state.currentCard
        : state.currentCard
      const expected = expectedAnswer(card)
      const correct = action.value === expected
      const event: AnswerEvent = { a: card.a, b: card.b, correct, rt: action.rt, op: card.op }

      if (!correct) {
        return {
          ...state,
          phase: 'showing-correction',
          answers: [...state.answers, event],
        }
      }

      const updated = applyAnswer(card, { correct: true, rt: action.rt })
      const bumped = bumpAllExcept(state.cards, card.id)
      const retire = state.mode === 'arith' &&
        state.cards.some(c => c.id === card.id) && updated.box >= ARITH_RETIRE_BOX
      const newCards = retire
        ? bumped.filter(c => c.id !== card.id)
        : replaceCard(bumped, updated)
      const retiredIds = retire ? [...state.retiredIds, card.id] : state.retiredIds
      const correctCount = state.correctCount + 1
      const answers = [...state.answers, event]

      const reachedGoal = correctCount >= state.goalCount
      const reachedCap = answers.length >= state.hardCap

      if (reachedGoal || reachedCap) {
        return { ...state, cards: newCards, retiredIds, currentCard: null, correctCount, answers, phase: 'finished' }
      }

      const nextStateForPick: SessionState = { ...state, cards: newCards, correctCount }
      const nextCard = pickNextWithFinale(nextStateForPick)
      return {
        ...state,
        cards: newCards,
        retiredIds,
        currentCard: nextCard,
        correctCount,
        answers,
        phase: nextCard ? 'asking' : 'finished',
      }
    }

    case 'CONFIRM_CORRECTION': {
      if (state.phase !== 'showing-correction' || !state.currentCard) return state
      const card = state.mode === 'arith'
        ? state.cards.find(c => c.id === state.currentCard!.id) ?? state.currentCard
        : state.currentCard
      const expected = expectedAnswer(card)
      if (action.value !== expected) return state

      const updated = applyAnswer(card, { correct: false, rt: 0 })
      const bumped = bumpAllExcept(state.cards, card.id)
      const newCards = state.mode === 'arith' && !bumped.some(c => c.id === card.id)
        ? [...bumped, updated]
        : replaceCard(bumped, updated)
      // A mastered problem may be generated and missed again in this session.
      const retiredIds = state.retiredIds.filter(id => id !== card.id)
      const reachedCap = state.answers.length >= state.hardCap

      if (reachedCap) {
        return { ...state, cards: newCards, retiredIds, currentCard: null, phase: 'finished' }
      }

      const nextStateForPick: SessionState = { ...state, cards: newCards }
      const nextCard = pickNextWithFinale(nextStateForPick)
      return {
        ...state,
        cards: newCards,
        retiredIds,
        currentCard: nextCard,
        phase: nextCard ? 'asking' : 'finished',
      }
    }

    case 'END':
      return { ...state, phase: 'finished', currentCard: null }
  }
}

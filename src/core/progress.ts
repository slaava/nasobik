// src/core/progress.ts
import type { AnswerEvent, Card, GameMode } from './types'
import { opsForMode } from './cards'

export const MASTERED_BOX = 3

/**
 * How many of `total` dots to fill on the home screen for a game.
 * tables/clock: share of that game's cards in Box ≥ MASTERED_BOX.
 * arith: the deck is a mistake queue, so dots = total − open mistakes (empty queue = all filled).
 */
export function masteryDots(cards: Card[], mode: GameMode, total: number): number {
  const ops = opsForMode(mode)
  const mine = cards.filter(c => ops.includes(c.op))
  if (mode === 'arith') return Math.max(0, total - mine.length)
  if (mine.length === 0) return 0
  const mastered = mine.filter(c => c.box >= MASTERED_BOX).length
  return Math.round((total * mastered) / mine.length)
}

/** Number of consecutive correct answers at the end of the list. */
export function streakOf(answers: AnswerEvent[]): number {
  let n = 0
  for (let i = answers.length - 1; i >= 0 && answers[i]!.correct; i--) n++
  return n
}

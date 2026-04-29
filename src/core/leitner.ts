import type { Card } from './types'

export function applyAnswer(
  card: Card,
  outcome: { correct: boolean; rt: number },
): Card {
  const newBox = outcome.correct
    ? (Math.min(card.box + 1, 5) as Card['box'])
    : 1

  return {
    ...card,
    box: newBox,
    exposuresSinceLastSeen: 0,
    sessionsSinceLastSeen: 0,
    lastRT: outcome.rt,
    totalSeen: card.totalSeen + 1,
    totalCorrect: card.totalCorrect + (outcome.correct ? 1 : 0),
  }
}

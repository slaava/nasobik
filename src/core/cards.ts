import type { Card, CardOp } from './types'

export function cardId(profileId: string, op: CardOp, a: number, b: number): string {
  return op === 'mul' ? `${profileId}:${a}x${b}` : `${profileId}:${a}x${b}:div`
}

export function expectedAnswer(card: Card): number {
  return card.op === 'div' ? card.b : card.a * card.b
}

export function formatQuestion(card: Card): string {
  return card.op === 'div' ? `${card.a * card.b} ÷ ${card.a}` : `${card.a} × ${card.b}`
}

function freshCard(profileId: string, op: CardOp, a: number, b: number): Card {
  return {
    id: cardId(profileId, op, a, b),
    profileId,
    op,
    a,
    b,
    box: 1,
    exposuresSinceLastSeen: 0,
    sessionsSinceLastSeen: 0,
    lastRT: null,
    totalSeen: 0,
    totalCorrect: 0,
  }
}

export function generateCardsForTables(
  profileId: string,
  tables: number[],
  includeDivision: boolean,
): Card[] {
  const cards: Card[] = []
  for (const a of tables) {
    for (let b = 1; b <= 10; b++) {
      cards.push(freshCard(profileId, 'mul', a, b))
      if (includeDivision) cards.push(freshCard(profileId, 'div', a, b))
    }
  }
  return cards
}

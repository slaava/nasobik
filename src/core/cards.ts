import type { Card, CardOp, GameMode } from './types'

export function cardId(profileId: string, op: CardOp, a: number, b: number): string {
  if (op === 'add') return `${profileId}:${a}+${b}`
  if (op === 'sub') return `${profileId}:${a}-${b}`
  return op === 'mul' ? `${profileId}:${a}x${b}` : `${profileId}:${a}x${b}:div`
}

export function expectedAnswer(card: Card): number {
  if (card.op === 'add') return card.a + card.b
  if (card.op === 'sub') return card.a - card.b
  return card.op === 'div' ? card.b : card.a * card.b
}

export function formatQuestion(card: Card): string {
  if (card.op === 'add') return `${card.a} + ${card.b}`
  if (card.op === 'sub') return `${card.a} − ${card.b}`
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

export const ARITH_OPS: readonly CardOp[] = ['add', 'sub']
export const TABLE_OPS: readonly CardOp[] = ['mul', 'div']

export function isArithOp(op: CardOp): boolean {
  return ARITH_OPS.includes(op)
}

export function opsForMode(mode: GameMode): readonly CardOp[] {
  return mode === 'arith' ? ARITH_OPS : TABLE_OPS
}

export function generateArithCard(profileId: string, rng: () => number = Math.random): Card {
  const op = rng() < 0.5 ? 'add' : 'sub'
  const a = Math.floor(rng() * 99) + (op === 'add' ? 1 : 2)
  const b = Math.floor(rng() * (op === 'add' ? 100 - a : a - 1)) + 1
  return freshCard(profileId, op, a, b)
}

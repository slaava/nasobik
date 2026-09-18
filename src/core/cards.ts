import { isClockOp, formatTime, phraseFor, clockLevelOf, cardsForClockLevel } from './clock'
import type { Card, CardOp, GameMode, Profile } from './types'

export function cardId(profileId: string, op: CardOp, a: number, b: number): string {
  if (isClockOp(op)) return `${profileId}:${op}:${a}:${b}`
  if (op === 'add') return `${profileId}:${a}+${b}`
  if (op === 'sub') return `${profileId}:${a}-${b}`
  return op === 'mul' ? `${profileId}:${a}x${b}` : `${profileId}:${a}x${b}:div`
}

export function expectedAnswer(card: Card): number {
  if (isClockOp(card.op)) return (card.op === 'clk-24to12' ? card.a - 12 : card.a) * 100 + card.b
  if (card.op === 'add') return card.a + card.b
  if (card.op === 'sub') return card.a - card.b
  return card.op === 'div' ? card.b : card.a * card.b
}

export function formatQuestion(card: Card): string {
  if (card.op === 'clk-read') return 'Kolik je hodin?'
  if (card.op === 'clk-phrase' || card.op === 'clk-phrase-dig') return phraseFor(card.a, card.b)
  if (card.op === 'clk-24to12') return 'Kolik ukazují ručičkové hodiny?'
  if (card.op === 'clk-12to24') return 'Napiš čas digitálně.'
  if (card.op === 'add') return `${card.a} + ${card.b}`
  if (card.op === 'sub') return `${card.a} − ${card.b}`
  return card.op === 'div' ? `${card.a * card.b} ÷ ${card.a}` : `${card.a} × ${card.b}`
}

export function freshCard(profileId: string, op: CardOp, a: number, b: number): Card {
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
  if (mode === 'clock') return CLOCK_OPS
  return mode === 'arith' ? ARITH_OPS : TABLE_OPS
}

export function generateArithCard(profileId: string, rng: () => number = Math.random): Card {
  const op = rng() < 0.5 ? 'add' : 'sub'
  const a = Math.floor(rng() * 99) + (op === 'add' ? 1 : 2)
  const b = Math.floor(rng() * (op === 'add' ? 100 - a : a - 1)) + 1
  return freshCard(profileId, op, a, b)
}

export const CLOCK_OPS: readonly CardOp[] = ['clk-read', 'clk-phrase', 'clk-phrase-dig', 'clk-24to12', 'clk-12to24']

export function isCorrectAnswer(card: Card, value: number): boolean {
  if (card.op === 'clk-read' || card.op === 'clk-phrase' || card.op === 'clk-phrase-dig') {
    return value === expectedAnswer(card) || value === ((card.a + 12) % 24) * 100 + card.b
  }
  return value === expectedAnswer(card)
}

export function formatAnswer(card: Card, value: number): string {
  return isClockOp(card.op) ? formatTime(value) : String(value)
}

export function isCardActive(card: Card, profile: Profile): boolean {
  if (card.op === 'mul') return profile.unlockedTables.includes(card.a)
  if (card.op === 'div') return profile.divisionEnabled && profile.unlockedTables.includes(card.a)
  if (isArithOp(card.op)) return true
  return profile.clockLevels.includes(clockLevelOf(card))
}

export function requiredCardsForProfile(profile: Profile): Card[] {
  return [
    ...generateCardsForTables(profile.id, profile.unlockedTables, profile.divisionEnabled),
    ...profile.clockLevels.flatMap(level => cardsForClockLevel(profile.id, level)),
  ]
}

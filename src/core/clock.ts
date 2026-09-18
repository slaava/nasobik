import type { Card, CardOp, ClockLevel } from './types'
import { freshCard } from './cards'

export const CLOCK_LEVELS: readonly ClockLevel[] = ['hours', 'half', 'quarter', 'phrase', 'five', 'digital']
export const CLOCK_LEVEL_LABELS: Record<ClockLevel, string> = {
  hours: 'Celé hodiny',
  half: 'Půlhodiny',
  quarter: 'Čtvrthodiny',
  phrase: 'České fráze (půl osmé, čtvrt na osm)',
  five: 'Po pěti minutách',
  digital: 'Digitální čas (24 h)',
}
export type InputMode = 'keypad' | 'choice-digital' | 'choice-clock'

export function isClockOp(op: CardOp): boolean {
  return op.startsWith('clk-')
}

export function cardsForClockLevel(profileId: string, level: ClockLevel): Card[] {
  const minutes = {
    hours: [0], half: [30], quarter: [15, 45], phrase: [0, 15, 30, 45],
    five: [5, 10, 20, 25, 35, 40, 50, 55], digital: [0, 30],
  }[level]
  const ops: CardOp[] = level === 'digital' ? ['clk-24to12', 'clk-12to24']
    : level === 'phrase' ? ['clk-phrase', 'clk-phrase-dig'] : ['clk-read']
  const cards: Card[] = []
  for (const op of ops) {
    for (let a = level === 'digital' ? 13 : 1; a <= (level === 'digital' ? 23 : 12); a++) {
      for (const b of minutes) cards.push(freshCard(profileId, op, a, b))
    }
  }
  return cards
}

export function clockLevelOf(card: Card): ClockLevel {
  if (!isClockOp(card.op)) throw new Error('Not a clock card')
  if (card.op === 'clk-phrase' || card.op === 'clk-phrase-dig') return 'phrase'
  if (card.op !== 'clk-read') return 'digital'
  if (card.b === 0) return 'hours'
  if (card.b === 30) return 'half'
  if (card.b === 15 || card.b === 45) return 'quarter'
  return 'five'
}

export function inputModeFor(card: Card): InputMode {
  if (card.op === 'clk-phrase') return 'choice-clock'
  if (card.op === 'clk-phrase-dig') return 'choice-digital'
  if (card.op === 'clk-read' && [0, 15, 30, 45].includes(card.b) && card.box <= 2) return 'choice-digital'
  return 'keypad'
}

export function choiceOptionsFor(card: Card, rng: () => number): number[] {
  const wrap = (hour: number) => (hour + 11) % 12 + 1
  const answer = card.a * 100 + card.b
  const next = wrap(card.a + 1) * 100 + card.b
  const previous = wrap(card.a - 1) * 100 + card.b
  const altMinute = ({ 0: 30, 30: 0, 15: 45, 45: 15 } as Record<number, number>)[card.b] ?? card.b
  const alternate = card.a * 100 + altMinute
  let second = rng() < 0.5 ? previous : alternate
  if (second === answer || second === next) second = previous
  const options = [answer, next, second]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = options[i]!
    options[i] = options[j]!
    options[j] = tmp
  }
  return options
}

const HOURS = ['jedna hodina', 'dvě hodiny', 'tři hodiny', 'čtyři hodiny', 'pět hodin', 'šest hodin', 'sedm hodin', 'osm hodin', 'devět hodin', 'deset hodin', 'jedenáct hodin', 'dvanáct hodin']
const GEN = ['jedné', 'druhé', 'třetí', 'čtvrté', 'páté', 'šesté', 'sedmé', 'osmé', 'deváté', 'desáté', 'jedenácté', 'dvanácté']
const ACC = ['jednu', 'dvě', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět', 'deset', 'jedenáct', 'dvanáct']

export function phraseFor(a: number, b: number): string {
  if (b === 0) return HOURS[a - 1]!
  if (b === 30) return 'půl ' + GEN[a % 12]
  return (b === 15 ? 'čtvrt na ' : 'tři čtvrtě na ') + ACC[a % 12]
}

export function dayPartFor(a: number): { label: string; icon: string } {
  return a < 18 ? { label: 'odpoledne', icon: '☀️' } : { label: 'večer', icon: '🌙' }
}

export function formatTime(value: number): string {
  return `${Math.floor(value / 100)}:${String(value % 100).padStart(2, '0')}`
}

export function formatClockInput(digits: string): string {
  if (!digits) return ' '
  return digits.length <= 2 ? digits : digits.slice(0, -2) + ':' + digits.slice(-2)
}

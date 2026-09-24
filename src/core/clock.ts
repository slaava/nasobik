import type { Card, CardOp, ClockLevel } from './types'
import { freshCard } from './cards'

export const CLOCK_LEVELS: readonly ClockLevel[] = ['hours', 'half', 'quarter', 'phrase', 'five', 'digital', 'to-hour', 'duration']
export const CLOCK_LEVEL_LABELS: Record<ClockLevel, string> = {
  hours: 'Celé hodiny',
  half: 'Půlhodiny',
  quarter: 'Čtvrthodiny',
  phrase: 'České fráze (půl osmé, čtvrt na osm)',
  five: 'Po pěti minutách',
  digital: 'Digitální čas (24 h)',
  'to-hour': 'Kolik minut chybí do celé hodiny',
  duration: 'Jak dlouho to trvalo (od–do)',
}
export type InputMode = 'keypad' | 'choice-digital' | 'choice-clock'

export function isClockOp(op: CardOp): boolean {
  return op.startsWith('clk-')
}

// Time-arithmetic levels (as in the 3rd-grade workbook). The hour never changes
// the answer, only the wording, so each level keeps a small fixed set of hours.
// 11 → "do poledne", 23 → "do půlnoci" are the workbook's own examples.
const TO_HOUR_HOURS = [8, 11, 15, 23]
const FIVE_MINUTES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
// [start minute, length in minutes], from easy to hard: whole fives inside one
// hour, exact minutes (15:08 → 15:40), across the full hour (15:40 → 16:10),
// one whole hour. The start hour rotates through DURATION_HOURS.
const DURATIONS: readonly (readonly [number, number])[] = [
  [0, 15], [0, 20], [0, 25], [10, 15], [10, 20], [10, 25], [20, 15], [20, 20], [20, 25], [30, 15], [30, 20], [30, 25],
  [8, 32], [12, 25], [3, 44], [17, 26], [21, 18], [34, 19], [6, 47], [41, 13],
  [40, 30], [45, 35], [50, 25], [35, 40], [55, 20], [30, 45], [48, 24], [52, 17],
  [0, 60], [15, 60], [30, 60],
]
const DURATION_HOURS = [15, 7, 13, 16, 9, 18]

export function cardsForClockLevel(profileId: string, level: ClockLevel): Card[] {
  if (level === 'to-hour') {
    return TO_HOUR_HOURS.flatMap(a => FIVE_MINUTES.map(b => freshCard(profileId, 'clk-to-hour', a, b)))
  }
  if (level === 'duration') {
    return DURATIONS.map(([start, length], i) =>
      freshCard(profileId, 'clk-duration', DURATION_HOURS[i % DURATION_HOURS.length]! * 100 + start, length))
  }
  const minutes = {
    hours: [0], half: [30], quarter: [15, 45], phrase: [0, 15, 30, 45],
    five: [5, 10, 20, 25, 35, 40, 50, 55], digital: [0, 30],
  }[level]!
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
  if (card.op === 'clk-to-hour') return 'to-hour'
  if (card.op === 'clk-duration') return 'duration'
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

// Ops whose answer is a number of minutes, not a time of day (plain keypad
// input without the colon, "20 minut" in the correction).
export function answersInMinutes(op: CardOp): boolean {
  return op === 'clk-to-hour' || op === 'clk-duration'
}

export function minutesLabel(n: number): string {
  if (n === 1) return '1 minuta'
  if (n >= 2 && n <= 4) return `${n} minuty`
  return `${n} minut`
}

const DURATION_ASKS = [
  'Kolik minut kočka spala?',
  'Kolik minut si kočka hrála?',
  'Kolik minut kočka lovila myš?',
  'Kolik minut se kočka myla?',
  'Kolik minut kočka jedla?',
  'Kolik minut kočka koukala z okna?',
]

function targetOf(a: number): string {
  const next = a + 1
  if (next === 12) return 'poledne'
  if (next === 24) return 'půlnoci'
  return `${next}:00`
}

// Second line under the question (the question itself comes from formatQuestion).
export function clockHintFor(card: Card): string | null {
  if (card.op === 'clk-phrase') return 'Který ciferník to ukazuje?'
  if (card.op === 'clk-phrase-dig') return 'Který digitální čas to je?'
  if (card.op === 'clk-to-hour') return `Kolik minut chybí do ${targetOf(card.a)}?`
  if (card.op === 'clk-duration') return DURATION_ASKS[(card.a + card.b) % DURATION_ASKS.length]!
  return null
}

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

import { describe, it, expect } from 'vitest'
import { CLOCK_LEVELS, cardsForClockLevel, clockLevelOf, phraseFor, inputModeFor, choiceOptionsFor, formatTime, formatClockInput, dayPartFor } from './clock'
import { freshCard } from './cards'

const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]! }

describe('clock domain', () => {
  it('generates each level with unique cards and round-trips every level', () => {
    const counts = [12, 12, 24, 48, 96, 44]
    const ids: string[] = []
    CLOCK_LEVELS.forEach((level, i) => {
      const cards = cardsForClockLevel('p', level)
      expect(cards).toHaveLength(counts[i]!)
      cards.forEach(card => expect(clockLevelOf(card)).toBe(level))
      ids.push(...cards.map(c => c.id))
    })
    expect(new Set(ids).size).toBe(ids.length)
    expect(() => clockLevelOf(freshCard('p', 'mul', 2, 3))).toThrow()
  })

  it.each([
    [7, 30, 'půl osmé'], [7, 15, 'čtvrt na osm'], [12, 45, 'tři čtvrtě na jednu'],
    [12, 30, 'půl jedné'], [3, 0, 'tři hodiny'], [1, 0, 'jedna hodina'],
  ])('phrases %s:%s', (a, b, phrase) => expect(phraseFor(a as number, b as number)).toBe(phrase))

  it('introduces recognition before production', () => {
    const hours = cardsForClockLevel('p', 'hours')[0]!
    expect(inputModeFor(hours)).toBe('choice-digital')
    expect(inputModeFor({ ...hours, box: 3 })).toBe('keypad')
    expect(inputModeFor(cardsForClockLevel('p', 'five')[0]!)).toBe('keypad')
    expect(inputModeFor(cardsForClockLevel('p', 'phrase')[0]!)).toBe('choice-clock')
    expect(inputModeFor(cardsForClockLevel('p', 'digital')[0]!)).toBe('keypad')
  })

  it('includes the next-hour trap and both deterministic distractor variants', () => {
    const card = freshCard('p', 'clk-read', 7, 30)
    for (const [rng, distractor] of [[seq(0, 0, 0), 630], [seq(0.9, 0.9, 0.9), 700]] as const) {
      const options = choiceOptionsFor(card, rng)
      expect(options).toHaveLength(3)
      expect(new Set(options).size).toBe(3)
      expect(options).toEqual(expect.arrayContaining([730, 830, distractor]))
    }
    expect(choiceOptionsFor(freshCard('p', 'clk-read', 12, 0), seq(0))).toContain(100)
    expect(new Set(choiceOptionsFor(freshCard('p', 'clk-read', 7, 5), seq(0.9))).size).toBe(3)
  })

  it('formats times, partial input and day parts', () => {
    expect([730, 1530, 30].map(formatTime)).toEqual(['7:30', '15:30', '0:30'])
    expect(['', '7', '73', '730', '1930'].map(formatClockInput)).toEqual([' ', '7', '73', '7:30', '19:30'])
    expect(dayPartFor(15)).toEqual({ label: 'odpoledne', icon: '☀️' })
    expect(dayPartFor(19)).toEqual({ label: 'večer', icon: '🌙' })
  })
})

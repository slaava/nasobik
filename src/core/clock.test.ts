import { describe, it, expect } from 'vitest'
import { CLOCK_LEVELS, cardsForClockLevel, clockLevelOf, phraseFor, inputModeFor, choiceOptionsFor, formatTime, formatClockInput, dayPartFor, clockHintFor, minutesLabel, answersInMinutes } from './clock'
import { freshCard, expectedAnswer, formatQuestion, formatAnswer } from './cards'

const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]! }

describe('clock domain', () => {
  it('generates each level with unique cards and round-trips every level', () => {
    const counts = [12, 12, 24, 96, 96, 44, 44, 31]
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
    expect(inputModeFor({ ...cardsForClockLevel('p', 'phrase')[0]!, op: 'clk-phrase-dig' })).toBe('choice-digital')
    const phraseOps = new Set(cardsForClockLevel('p', 'phrase').map(c => c.op))
    expect(phraseOps).toEqual(new Set(['clk-phrase', 'clk-phrase-dig']))
    expect(clockLevelOf({ ...cardsForClockLevel('p', 'phrase')[0]!, op: 'clk-phrase-dig' })).toBe('phrase')
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

  it('asks minutes to the next full hour, noon and midnight like the workbook', () => {
    const q = (a: number, b: number) => {
      const c = freshCard('p', 'clk-to-hour', a, b)
      return [formatQuestion(c), clockHintFor(c), expectedAnswer(c)]
    }
    expect(q(11, 15)).toEqual(['Je čtvrt na dvanáct.', 'Kolik minut chybí do poledne?', 45])
    expect(q(11, 30)).toEqual(['Je půl dvanácté.', 'Kolik minut chybí do poledne?', 30])
    expect(q(23, 40)).toEqual(['Je 23:40.', 'Kolik minut chybí do půlnoci?', 20])
    expect(q(8, 5)).toEqual(['Je 8:05.', 'Kolik minut chybí do 9:00?', 55])
    expect(q(15, 45)).toEqual(['Je 15:45.', 'Kolik minut chybí do 16:00?', 15])
    for (const c of cardsForClockLevel('p', 'to-hour')) {
      expect(inputModeFor(c)).toBe('keypad')
      expect(answersInMinutes(c.op)).toBe(true)
    }
  })

  it('asks durations inside one hour, to the minute and across the full hour', () => {
    const cards = cardsForClockLevel('p', 'duration')
    const byText = new Map(cards.map(c => [formatQuestion(c), expectedAnswer(c)]))
    expect(byText.get('Od 15:00 do 15:15')).toBe(15)
    expect(byText.get('Od 15:08 do 15:40')).toBe(32)
    expect(byText.get('Od 13:40 do 14:10')).toBe(30)
    expect([...byText.values()]).toContain(60)
    for (const c of cards) {
      const [from, to] = formatQuestion(c).replace('Od ', '').split(' do ').map(t => t.split(':').map(Number))
      expect((to![0]! * 60 + to![1]!) - (from![0]! * 60 + from![1]!)).toBe(expectedAnswer(c))
      expect(expectedAnswer(c)).toBeGreaterThanOrEqual(5)
      expect(clockHintFor(c)).toMatch(/^Kolik minut .*\?$/)
    }
    expect(cards.filter(c => c.a % 100 + c.b > 60).length).toBeGreaterThanOrEqual(8)
  })

  it('formats minute answers in Czech', () => {
    expect([1, 3, 5, 20, 60].map(minutesLabel)).toEqual(['1 minuta', '3 minuty', '5 minut', '20 minut', '60 minut'])
    expect(formatAnswer(freshCard('p', 'clk-to-hour', 23, 40), 20)).toBe('20 minut')
  })
})

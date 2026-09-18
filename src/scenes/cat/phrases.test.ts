// src/scenes/cat/phrases.test.ts
import { describe, it, expect } from 'vitest'
import { PHRASES, pickPhrase, moodFor, type CatEvent } from './phrases'

const EVENTS: CatEvent[] = ['greeting', 'start', 'correct', 'streak', 'wrong', 'dunno', 'finish-good', 'finish-mixed']

describe('phrases', () => {
  it.each(EVENTS)('%s has at least 8 phrases', ev => {
    expect(PHRASES[ev].length).toBeGreaterThanOrEqual(8)
  })
  it('has about a hundred phrases in total and none is too long for a bubble', () => {
    const all = Object.values(PHRASES).flat()
    expect(all.length).toBeGreaterThanOrEqual(90)
    for (const p of all) expect(p.length, p).toBeLessThanOrEqual(48)
    expect(new Set(all).size).toBe(all.length)
  })
  it('is deterministic in the seed and cycles', () => {
    expect(pickPhrase('correct', 0)).toBe(PHRASES.correct[0])
    expect(pickPhrase('correct', PHRASES.correct.length)).toBe(PHRASES.correct[0])
    expect(pickPhrase('correct', 7)).toBe(pickPhrase('correct', 7))
  })
  it('substitutes the name', () => {
    expect(pickPhrase('greeting', 0, 'Ema')).toContain('Ema')
    expect(pickPhrase('greeting', 0, 'Ema')).not.toContain('{name}')
  })
  it('maps events to moods', () => {
    expect(moodFor('greeting')).toBe('neutral')
    expect(moodFor('start')).toBe('neutral')
    expect(moodFor('correct')).toBe('happy')
    expect(moodFor('streak')).toBe('happy')
    expect(moodFor('finish-good')).toBe('happy')
    expect(moodFor('wrong')).toBe('surprised')
    expect(moodFor('dunno')).toBe('surprised')
    expect(moodFor('finish-mixed')).toBe('neutral')
  })
})

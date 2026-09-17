// src/scenes/cat/phrases.test.ts
import { describe, it, expect } from 'vitest'
import { PHRASES, pickPhrase, moodFor, type CatEvent } from './phrases'

const EVENTS: CatEvent[] = ['greeting', 'correct', 'streak', 'wrong', 'dunno', 'finish-good', 'finish-mixed']

describe('phrases', () => {
  it.each(EVENTS)('%s has at least 3 phrases', ev => {
    expect(PHRASES[ev].length).toBeGreaterThanOrEqual(3)
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
    expect(moodFor('correct')).toBe('happy')
    expect(moodFor('streak')).toBe('happy')
    expect(moodFor('finish-good')).toBe('happy')
    expect(moodFor('wrong')).toBe('surprised')
    expect(moodFor('dunno')).toBe('surprised')
    expect(moodFor('finish-mixed')).toBe('neutral')
  })
})

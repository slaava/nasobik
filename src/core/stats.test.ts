import { describe, it, expect } from 'vitest'
import { todayStats, weekStats } from './stats'
import type { Session } from './types'

function mkSession(profileId: string, startedAt: number, durationMs: number, results: boolean[]): Session {
  return {
    id: `s-${startedAt}`,
    profileId,
    startedAt,
    endedAt: startedAt + durationMs,
    answers: results.map((correct, i) => ({ a: 2, b: i + 1, correct, rt: 1500 })),
  }
}

describe('todayStats', () => {
  const now = new Date('2026-05-17T12:00:00Z').getTime()
  const yesterday = now - 86_400_000

  it('returns zeros when no sessions', () => {
    expect(todayStats([], now)).toEqual({ questions: 0, correctPct: 0, minutes: 0 })
  })

  it('only counts sessions from today', () => {
    const sessions = [
      mkSession('p1', yesterday, 5 * 60_000, [true, true, true]),
      mkSession('p1', now - 60_000, 4 * 60_000, [true, true, false, true]),
    ]
    const s = todayStats(sessions, now)
    expect(s.questions).toBe(4)
    expect(s.correctPct).toBe(75)
    expect(s.minutes).toBe(4)
  })
})

describe('weekStats', () => {
  const now = new Date('2026-05-17T12:00:00Z').getTime()
  const fiveDaysAgo = now - 5 * 86_400_000
  const tenDaysAgo = now - 10 * 86_400_000

  it('returns zeros when no sessions', () => {
    expect(weekStats([], now)).toEqual({ sessions: 0, questions: 0, minutes: 0 })
  })

  it('includes sessions from the last 7 days, ignores older', () => {
    const sessions = [
      mkSession('p1', tenDaysAgo, 5 * 60_000, [true, true]),
      mkSession('p1', fiveDaysAgo, 6 * 60_000, [true, true, true]),
      mkSession('p1', now - 60_000, 5 * 60_000, [true, false]),
    ]
    const s = weekStats(sessions, now)
    expect(s.sessions).toBe(2)
    expect(s.questions).toBe(5)
    expect(s.minutes).toBe(11)
  })
})

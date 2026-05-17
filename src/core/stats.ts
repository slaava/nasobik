import type { Session } from './types'

export type DayStats = {
  questions: number
  correctPct: number
  minutes: number
}

export type WeekStats = {
  sessions: number
  questions: number
  minutes: number
}

function isoDate(t: number): string {
  return new Date(t).toISOString().slice(0, 10)
}

export function todayStats(sessions: Session[], now: number = Date.now()): DayStats {
  const today = isoDate(now)
  const todays = sessions.filter(s => isoDate(s.startedAt) === today)
  const answers = todays.flatMap(s => s.answers)
  const correct = answers.filter(a => a.correct).length
  const ms = todays.reduce((sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt), 0)
  return {
    questions: answers.length,
    correctPct: answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100),
    minutes: Math.round(ms / 60_000),
  }
}

export function weekStats(sessions: Session[], now: number = Date.now()): WeekStats {
  const cutoff = now - 7 * 86_400_000
  const week = sessions.filter(s => s.startedAt >= cutoff)
  const answers = week.flatMap(s => s.answers)
  const ms = week.reduce((sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt), 0)
  return {
    sessions: week.length,
    questions: answers.length,
    minutes: Math.round(ms / 60_000),
  }
}

import { useState } from 'react'
// src/ui/HomeScreen.tsx
import type { Card, GameMode, Profile, Session } from '../core/types'
import { masteryDots } from '../core/progress'
import { todayStats } from '../core/stats'
import { CatHead } from '../scenes/cat/CatHead'
import { Bubble } from '../scenes/cat/Bubble'
import { pickPhrase } from '../scenes/cat/phrases'
import { ProgressDots } from './ProgressDots'

type Props = {
  profile: Profile
  cards: Card[]
  sessions: Session[]
  onPlay: (mode: GameMode) => void
  onParent: () => void
}

const GAMES: { mode: GameMode; glyph: string; label: string; enabled: (p: Profile) => boolean }[] = [
  { mode: 'tables', glyph: '× ÷', label: 'Násobení', enabled: () => true },
  { mode: 'arith', glyph: '+ −', label: 'Sčítání a odčítání', enabled: p => p.arithEnabled },
  { mode: 'clock', glyph: '🕒', label: 'Hodiny', enabled: p => p.clockEnabled },
]

function plural(n: number, one: string, few: string, many: string) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many
}

export function HomeScreen({ profile, cards, sessions, onPlay, onParent }: Props) {
  const today = todayStats(sessions)
  const todaySessions = sessions.filter(s => new Date(s.startedAt).toDateString() === new Date().toDateString()).length
  const todayCorrect = Math.round((today.questions * today.correctPct) / 100)
  // Seed the greeting by day when this screen opens; keep it stable on re-render.
  const [seed] = useState(() => Math.floor(Date.now() / 86_400_000))
  return (
    <div className="relative flex flex-col h-full bg-paper text-ink px-4 pt-10 pb-4 lg:max-w-xl lg:mx-auto">
      <button type="button" onClick={onParent} aria-label="Pro rodiče" className="absolute top-3 right-4 text-2xl">⚙️</button>
      <div className="flex items-end">
        <CatHead mood="neutral" className="w-28 h-24 shrink-0" />
        <Bubble className="ml-2 text-base">{pickPhrase('greeting', seed, profile.name)}</Bubble>
      </div>
      <div className="flex flex-col mt-6">
        {GAMES.filter(g => g.enabled(profile)).map(g => (
          <button
            key={g.mode}
            type="button"
            onClick={() => onPlay(g.mode)}
            className="flex items-center rounded-xl border-[1.5px] border-ink bg-card px-3 py-3 mb-3 text-left active:scale-95"
          >
            <span className="w-10 text-center text-lg font-bold">{g.glyph}</span>
            <span className="ml-2 font-bold text-base">{g.label}</span>
            <ProgressDots total={10} filled={masteryDots(cards, g.mode, 10)} label={g.label} className="ml-auto" />
          </button>
        ))}
      </div>
      <p className="mt-auto text-center text-sm text-ink">
        Dnes: {todaySessions} {plural(todaySessions, 'hra', 'hry', 'her')} · {todayCorrect} správně
      </p>
    </div>
  )
}

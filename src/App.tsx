import { useEffect, useState } from 'react'
import { bootstrapDefaultProfile } from './bootstrap'
import {
  openDb,
  putProfile,
  putCards,
  deleteCards,
  putSession,
  getCardsForProfile,
  getSessionsForProfile,
  syncCardsForProfile,
} from './db/repo'
import type { Card, Profile, Session, GameMode, ClockLevel } from './core/types'
import { opsForMode, isCardActive } from './core/cards'
import type { SessionState } from './core/session'
import { SessionScreen } from './ui/SessionScreen'
import { SessionSummary } from './ui/SessionSummary'
import { ParentGate } from './ui/ParentGate'
import { ParentSettings } from './ui/ParentSettings'
import { beeScene } from './scenes/bee'
import beeIdleUrl from './scenes/bee/assets/bee-idle.svg'

type Phase = 'loading' | 'home' | 'playing' | 'summary' | 'parent-gate' | 'parent-settings'

// crypto.randomUUID requires a secure context (HTTPS or localhost). The app is
// served over plain HTTP on the LAN/Tailscale during dev, where it would throw
// "crypto.randomUUID is not a function" and silently break the post-session
// flow (no summary, stuck on the finished SessionScreen). Sessions are local
// only, so any unique-enough id is fine.
function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function App() {
  const [mode, setMode] = useState<GameMode>('tables')
  const [phase, setPhase] = useState<Phase>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [lastSummary, setLastSummary] = useState<{ correct: number; wrong: number } | null>(null)

  useEffect(() => {
    void (async () => {
      const { profile, cards } = await bootstrapDefaultProfile()
      const db = await openDb()
      const sess = await getSessionsForProfile(db, profile.id)
      db.close()
      setProfile(profile)
      setCards(cards)
      setSessions(sess)
      setPhase('home')
    })()
  }, [])

  const onFinish = async (state: SessionState) => {
    if (!profile) return
    const wrongCount = state.answers.filter(a => !a.correct).length
    setLastSummary({ correct: state.correctCount, wrong: wrongCount })
    const updated = new Map(state.cards.map(c => [c.id, c]))
    const retired = new Set(state.retiredIds)
    setCards(prev => [
      ...prev.filter(c => !retired.has(c.id)).map(c => updated.get(c.id) ?? c),
      ...state.cards.filter(c => !prev.some(p => p.id === c.id)),
    ])
    const totalMs = state.answers.reduce((sum, a) => sum + a.rt, 0)
    const endedAt = Date.now()
    const newSession: Session = {
      id: makeSessionId(),
      profileId: profile.id,
      startedAt: endedAt - totalMs,
      endedAt,
      answers: state.answers,
    }
    const db = await openDb()
    await putCards(db, state.cards)
    if (state.retiredIds.length) await deleteCards(db, state.retiredIds)
    await putSession(db, newSession)
    db.close()
    setSessions(prev => [...prev, newSession])
    setPhase('summary')
  }

  const onToggleTable = async (n: number) => {
    if (!profile) return
    const next = profile.unlockedTables.includes(n)
      ? profile.unlockedTables.filter(x => x !== n)
      : [...profile.unlockedTables, n].sort((a, b) => a - b)
    const updatedProfile = { ...profile, unlockedTables: next }
    const db = await openDb()
    await putProfile(db, updatedProfile)
    await syncCardsForProfile(db, updatedProfile)
    const freshCards = await getCardsForProfile(db, profile.id)
    db.close()
    setProfile(updatedProfile)
    setCards(freshCards)
  }

  const onToggleDivision = async () => {
    if (!profile) return
    const updatedProfile = { ...profile, divisionEnabled: !profile.divisionEnabled }
    const db = await openDb()
    await putProfile(db, updatedProfile)
    await syncCardsForProfile(db, updatedProfile)
    const freshCards = await getCardsForProfile(db, profile.id)
    db.close()
    setProfile(updatedProfile)
    setCards(freshCards)
  }

  const onToggleClock = async () => {
    if (!profile) return
    const updatedProfile = { ...profile, clockEnabled: !profile.clockEnabled }
    const db = await openDb()
    await putProfile(db, updatedProfile)
    await syncCardsForProfile(db, updatedProfile)
    const freshCards = await getCardsForProfile(db, profile.id)
    db.close()
    setProfile(updatedProfile)
    setCards(freshCards)
  }

  const onToggleClockLevel = async (level: ClockLevel) => {
    if (!profile) return
    const clockLevels = profile.clockLevels.includes(level)
      ? profile.clockLevels.filter(l => l !== level)
      : [...profile.clockLevels, level]
    const updatedProfile = { ...profile, clockLevels }
    const db = await openDb()
    await putProfile(db, updatedProfile)
    await syncCardsForProfile(db, updatedProfile)
    const freshCards = await getCardsForProfile(db, profile.id)
    db.close()
    setProfile(updatedProfile)
    setCards(freshCards)
  }

  const onToggleArith = async () => {
    if (!profile) return
    const updated = { ...profile, arithEnabled: !profile.arithEnabled }
    const db = await openDb()
    await putProfile(db, updated)
    db.close()
    setProfile(updated)
  }

  const onRename = async (newName: string) => {
    if (!profile) return
    const updated = { ...profile, name: newName }
    const db = await openDb()
    await putProfile(db, updated)
    db.close()
    setProfile(updated)
  }

  if (phase === 'loading' || !profile) {
    return <div className="flex h-full items-center justify-center bg-amber-50 text-amber-900">Načítám…</div>
  }

  const games = [
    { mode: 'tables' as const, glyph: '× ÷', label: 'Násobení' },
    ...(profile.arithEnabled ? [{ mode: 'arith' as const, glyph: '+ −', label: 'Sčítání a odčítání' }] : []),
    ...(profile.clockEnabled ? [{ mode: 'clock' as const, glyph: '🕒', label: 'Hodiny' }] : []),
  ]

  if (phase === 'home') {
    return (
      <div className="relative flex flex-col h-full items-center justify-center bg-amber-50 gap-3 p-4 [@media(min-height:760px)]:gap-6 [@media(min-height:760px)]:p-8">
        <button
          type="button"
          onClick={() => setPhase('parent-gate')}
          aria-label="Pro rodiče"
          className="absolute top-4 right-4 text-2xl opacity-40 hover:opacity-100 transition"
        >
          ⚙️
        </button>
        <img src={beeIdleUrl} alt="" className="h-[24dvh] [@media(min-height:760px)]:h-[32dvh] w-auto select-none" draggable={false} />
        <h1 className="text-4xl font-bold text-amber-900">Ahoj, {profile.name}!</h1>
        <p className="text-xl text-amber-800">Pojďme nakrmit včelku.</p>
        {games.length > 1 ? (
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {games.map((game, index) => (
              <button
                key={game.mode}
                type="button"
                onClick={() => {
                  setMode(game.mode)
                  setPhase('playing')
                }}
                className={`rounded-2xl bg-amber-500 text-white py-3 px-4 font-bold shadow active:scale-95 ${games.length === 3 && index === 2 ? 'col-span-2' : ''}`}
              >
                <span className="block text-3xl">{game.glyph}</span>
                <span className="block text-base [@media(min-height:760px)]:text-lg">{game.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode('tables')
              setPhase('playing')
            }}
            className="rounded-2xl bg-amber-500 text-white py-4 px-8 text-2xl font-bold shadow active:scale-95"
          >
            HRÁT
          </button>
        )}
      </div>
    )
  }

  if (phase === 'parent-gate') {
    return (
      <ParentGate
        onUnlock={() => setPhase('parent-settings')}
        onCancel={() => setPhase('home')}
      />
    )
  }

  if (phase === 'parent-settings') {
    return (
      <ParentSettings
        name={profile.name}
        unlockedTables={profile.unlockedTables}
        divisionEnabled={profile.divisionEnabled}
        arithEnabled={profile.arithEnabled}
        onToggleArith={onToggleArith}
        clockEnabled={profile.clockEnabled}
        clockLevels={profile.clockLevels}
        onToggleClock={onToggleClock}
        onToggleClockLevel={onToggleClockLevel}
        cards={cards}
        sessions={sessions}
        onRename={onRename}
        onToggleTable={onToggleTable}
        onToggleDivision={onToggleDivision}
        onBack={() => setPhase('home')}
      />
    )
  }

  if (phase === 'playing') {
    return (
      <SessionScreen
        cards={cards.filter(c => opsForMode(mode).includes(c.op) && isCardActive(c, profile))}
        mode={mode}
        profileId={profile.id}
        goalCount={beeScene.goalCount}
        scene={beeScene}
        onFinish={onFinish}
      />
    )
  }

  if (phase === 'summary' && lastSummary) {
    return (
      <SessionSummary
        correctCount={lastSummary.correct}
        wrongCount={lastSummary.wrong}
        onPlayAgain={() => setPhase('playing')}
        onDone={() => setPhase('home')}
      />
    )
  }

  return null
}

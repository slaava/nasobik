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
import { catScene } from './scenes/cat'
import { HomeScreen } from './ui/HomeScreen'

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
    return <div className="flex h-full items-center justify-center bg-paper text-ink">Načítám…</div>
  }

  if (phase === 'home') {
    return (
      <HomeScreen
        profile={profile}
        cards={cards}
        sessions={sessions}
        onPlay={m => { setMode(m); setPhase('playing') }}
        onParent={() => setPhase('parent-gate')}
      />
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
        goalCount={catScene.goalCount}
        scene={catScene}
        onFinish={onFinish}
        onExit={() => setPhase('home')}
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

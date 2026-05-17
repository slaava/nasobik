import { useEffect, useState } from 'react'
import { bootstrapDefaultProfile } from './bootstrap'
import {
  openDb,
  putProfile,
  putCards,
  putSession,
  getCardsForProfile,
  syncCardsToUnlockedTables,
} from './db/repo'
import type { Card, Profile } from './core/types'
import type { SessionState } from './core/session'
import { SessionScreen } from './ui/SessionScreen'
import { SessionSummary } from './ui/SessionSummary'
import { ParentGate } from './ui/ParentGate'
import { ParentSettings } from './ui/ParentSettings'
import { beeScene } from './scenes/bee'
import beeIdleUrl from './scenes/bee/assets/bee-idle.svg'

type Phase = 'loading' | 'home' | 'playing' | 'summary' | 'parent-gate' | 'parent-settings'

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [lastSummary, setLastSummary] = useState<{ correct: number; wrong: number } | null>(null)

  useEffect(() => {
    void bootstrapDefaultProfile().then(({ profile, cards }) => {
      setProfile(profile)
      setCards(cards)
      setPhase('home')
    })
  }, [])

  const onFinish = async (state: SessionState) => {
    if (!profile) return
    const wrongCount = state.answers.filter(a => !a.correct).length
    setLastSummary({ correct: state.correctCount, wrong: wrongCount })
    setCards(state.cards)
    const db = await openDb()
    await putCards(db, state.cards)
    await putSession(db, {
      id: crypto.randomUUID(),
      profileId: profile.id,
      startedAt: Date.now() - 1,
      endedAt: Date.now(),
      answers: state.answers,
    })
    db.close()
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
    await syncCardsToUnlockedTables(db, profile.id, next)
    const freshCards = await getCardsForProfile(db, profile.id)
    db.close()
    setProfile(updatedProfile)
    setCards(freshCards)
  }

  if (phase === 'loading' || !profile) {
    return <div className="flex h-full items-center justify-center bg-amber-50 text-amber-900">Načítám…</div>
  }

  if (phase === 'home') {
    return (
      <div className="relative flex flex-col h-full items-center justify-center bg-amber-50 gap-6 p-8">
        <button
          type="button"
          onClick={() => setPhase('parent-gate')}
          aria-label="Pro rodiče"
          className="absolute top-4 right-4 text-2xl opacity-40 hover:opacity-100 transition"
        >
          ⚙️
        </button>
        <img src={beeIdleUrl} alt="" className="h-[40vh] w-auto select-none" draggable={false} />
        <h1 className="text-4xl font-bold text-amber-900">Ahoj, {profile.name}!</h1>
        <p className="text-xl text-amber-800">Pojďme nakrmit včelku.</p>
        <button
          type="button"
          onClick={() => setPhase('playing')}
          className="rounded-2xl bg-amber-500 text-white py-4 px-8 text-2xl font-bold shadow active:scale-95"
        >
          HRÁT
        </button>
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
        unlockedTables={profile.unlockedTables}
        onToggleTable={onToggleTable}
        onBack={() => setPhase('home')}
      />
    )
  }

  if (phase === 'playing') {
    return (
      <SessionScreen
        cards={cards}
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

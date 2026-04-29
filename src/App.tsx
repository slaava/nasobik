import { useEffect, useState } from 'react'
import { bootstrapDefaultProfile } from './bootstrap'
import { openDb, putCards, putSession } from './db/repo'
import type { Card, Profile } from './core/types'
import type { SessionState } from './core/session'
import { SessionScreen } from './ui/SessionScreen'
import { SessionSummary } from './ui/SessionSummary'
import { beeScene } from './scenes/bee'

type Phase = 'loading' | 'home' | 'playing' | 'summary'

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
    setPhase('summary')
  }

  if (phase === 'loading' || !profile) {
    return <div className="flex h-full items-center justify-center bg-amber-50 text-amber-900">Načítám…</div>
  }

  if (phase === 'home') {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-amber-50 gap-6 p-8">
        <div className="text-9xl">🐝</div>
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

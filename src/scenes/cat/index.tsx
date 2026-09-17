// src/scenes/cat/index.tsx
import type { Scene, SceneCtx } from '../types'
import { CatHead } from './CatHead'
import { Bubble } from './Bubble'
import { moodFor, pickPhrase, type CatEvent } from './phrases'
import { ProgressDots } from '../../ui/ProgressDots'

function eventOf(ctx: SceneCtx): CatEvent | null {
  if (ctx.lastEvent === 'idle') return null
  if (ctx.lastEvent === 'correct') return ctx.streak >= 3 ? 'streak' : 'correct'
  return ctx.lastEvent // 'wrong' | 'dunno'
}

// Scene components are intentionally exposed through the Scene object.
// eslint-disable-next-line react-refresh/only-export-components
function CatHero(ctx: SceneCtx) {
  const event = eventOf(ctx)
  const mood = event ? moodFor(event) : 'neutral'
  return (
    <div className="flex items-center">
      <CatHead mood={mood} className="w-28 h-24 lg:w-48 lg:h-40 shrink-0" />
      {event && <Bubble className="ml-2 text-sm lg:text-lg">{pickPhrase(event, ctx.phraseSeed)}</Bubble>}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
function SessionDots({ correctCount, goalCount }: SceneCtx) {
  return <ProgressDots total={goalCount} filled={correctCount} label="Sezení" size="sm" className="ml-3 shrink-0" />
}

export const catScene: Scene = {
  id: 'cat',
  name: 'Kočka',
  thumbnail: '🐱',
  goalCount: 20,
  Hero: CatHero,
  Container: SessionDots,
}

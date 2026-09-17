// src/scenes/types.ts
import type { ComponentType } from 'react'

export type SceneCtx = {
  correctCount: number
  wrongCount: number
  goalCount: number
  lastEvent: 'correct' | 'wrong' | 'dunno' | 'idle'
  /** Trailing correct answers, for "streak" phrases. */
  streak: number
  /** Deterministic seed for phrase selection (answers so far). */
  phraseSeed: number
}

export type Scene = {
  id: string
  name: string
  thumbnail: string
  goalCount: number
  Hero: ComponentType<SceneCtx>
  Container: ComponentType<SceneCtx>
}

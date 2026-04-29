import type { ComponentType } from 'react'

export type SceneCtx = {
  correctCount: number
  wrongCount: number
  goalCount: number
  lastEvent: 'correct' | 'wrong' | 'idle'
}

export type Scene = {
  id: string
  name: string
  thumbnail: string
  goalCount: number
  Hero: ComponentType<SceneCtx>
  Container: ComponentType<SceneCtx>
}

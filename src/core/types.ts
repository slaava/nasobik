export type Profile = {
  id: string
  name: string
  avatar: string
  createdAt: number
  unlockedTables: number[]
  selectedScene: string
}

export type Card = {
  id: string
  profileId: string
  a: number
  b: number
  box: 1 | 2 | 3 | 4 | 5
  exposuresSinceLastSeen: number
  sessionsSinceLastSeen: number
  lastRT: number | null
  totalSeen: number
  totalCorrect: number
}

export type AnswerEvent = {
  a: number
  b: number
  correct: boolean
  rt: number
}

export type Session = {
  id: string
  profileId: string
  startedAt: number
  endedAt: number | null
  answers: AnswerEvent[]
}

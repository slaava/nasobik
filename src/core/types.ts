export type Profile = {
  id: string
  name: string
  avatar: string
  createdAt: number
  unlockedTables: number[]
  selectedScene: string
  divisionEnabled: boolean
}

// op decides how the card is rendered and how the expected answer is computed:
//   mul → "a × b = ?", expected = a*b
//   div → "(a*b) ÷ a = ?", expected = b
// We always store a as the table number (divisor) and b as the multiplier, so
// the two ops form a clean pair per (a, b) fact with independent Leitner state.
export type CardOp = 'mul' | 'div'

export type Card = {
  id: string
  profileId: string
  op: CardOp
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

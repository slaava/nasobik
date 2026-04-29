import type { Card } from './types'

export function generateCardsForTables(profileId: string, tables: number[]): Card[] {
  const cards: Card[] = []
  for (const a of tables) {
    for (let b = 1; b <= 10; b++) {
      cards.push({
        id: `${profileId}:${a}x${b}`,
        profileId,
        a,
        b,
        box: 1,
        exposuresSinceLastSeen: 0,
        sessionsSinceLastSeen: 0,
        lastRT: null,
        totalSeen: 0,
        totalCorrect: 0,
      })
    }
  }
  return cards
}

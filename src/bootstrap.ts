import { openDb, getProfile, putProfile, getCardsForProfile, putCards } from './db/repo'
import { generateCardsForTables } from './core/cards'
import type { Profile, Card } from './core/types'

const DEFAULT_ID = 'anicka'

export async function bootstrapDefaultProfile(): Promise<{ profile: Profile; cards: Card[] }> {
  const db = await openDb()
  let profile = await getProfile(db, DEFAULT_ID)
  if (!profile) {
    profile = {
      id: DEFAULT_ID,
      name: 'Anička',
      avatar: '🐝',
      createdAt: Date.now(),
      unlockedTables: [1, 2, 5, 10],
      selectedScene: 'bee',
    }
    await putProfile(db, profile)
  }

  let cards = await getCardsForProfile(db, profile.id)
  if (cards.length === 0) {
    cards = generateCardsForTables(profile.id, profile.unlockedTables)
    await putCards(db, cards)
  }

  db.close()
  return { profile, cards }
}

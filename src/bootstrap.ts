import { openDb, getProfile, putProfile, getCardsForProfile, putCards } from './db/repo'
import { generateCardsForTables, cardId } from './core/cards'
import type { Profile, Card, CardOp } from './core/types'

const DEFAULT_ID = 'anicka'

// Legacy profiles (saved before divisionEnabled / op existed) come back from
// IndexedDB without those fields. We default division ON and migrate any
// legacy cards to op='mul', then top up division cards if missing. The
// migrated profile + new cards are persisted so subsequent boots are clean.
export async function bootstrapDefaultProfile(): Promise<{ profile: Profile; cards: Card[] }> {
  const db = await openDb()
  let profile = await getProfile(db, DEFAULT_ID)
  let isNewProfile = false
  if (!profile) {
    profile = {
      id: DEFAULT_ID,
      name: 'Emička',
      avatar: '🐝',
      createdAt: Date.now(),
      unlockedTables: [1, 2, 5, 10],
      selectedScene: 'bee',
      divisionEnabled: true,
    }
    await putProfile(db, profile)
    isNewProfile = true
  } else if (profile.divisionEnabled === undefined) {
    profile = { ...profile, divisionEnabled: true }
    await putProfile(db, profile)
  }

  let cards = await getCardsForProfile(db, profile.id)

  if (cards.length === 0) {
    cards = generateCardsForTables(profile.id, profile.unlockedTables, profile.divisionEnabled)
    await putCards(db, cards)
  } else if (!isNewProfile) {
    const { migrated, changed } = migrateLegacyCards(cards)
    cards = migrated
    if (changed) await putCards(db, cards)

    if (profile.divisionEnabled) {
      const missingDiv = missingDivisionCards(profile.id, profile.unlockedTables, cards)
      if (missingDiv.length > 0) {
        cards = [...cards, ...missingDiv]
        await putCards(db, missingDiv)
      }
    }
  }

  db.close()
  return { profile, cards }
}

function migrateLegacyCards(cards: Card[]): { migrated: Card[]; changed: boolean } {
  let changed = false
  const migrated = cards.map(c => {
    if (c.op === undefined) {
      changed = true
      return { ...c, op: 'mul' as CardOp }
    }
    return c
  })
  return { migrated, changed }
}

function missingDivisionCards(profileId: string, unlockedTables: number[], existing: Card[]): Card[] {
  const have = new Set(existing.map(c => c.id))
  const missing: Card[] = []
  for (const a of unlockedTables) {
    for (let b = 1; b <= 10; b++) {
      const id = cardId(profileId, 'div', a, b)
      if (!have.has(id)) {
        missing.push({
          id,
          profileId,
          op: 'div',
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
  }
  return missing
}

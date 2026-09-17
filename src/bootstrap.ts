import { openDb, getProfile, putProfile, getCardsForProfile, putCards, syncCardsForProfile } from './db/repo'
import type { Profile, Card, CardOp } from './core/types'

const DEFAULT_ID = 'anicka'

// Fill missing profile defaults, migrate legacy cards to op='mul', and
// insert any required cards without overwriting stored Leitner progress.
export async function bootstrapDefaultProfile(): Promise<{ profile: Profile; cards: Card[] }> {
  const db = await openDb()
  let profile = await getProfile(db, DEFAULT_ID)
  if (!profile) {
    profile = {
      id: DEFAULT_ID,
      name: 'Emička',
      avatar: '🐝',
      createdAt: Date.now(),
      unlockedTables: [1, 2, 5, 10],
      selectedScene: 'cat',
      divisionEnabled: true,
      arithEnabled: true,
      clockEnabled: true,
      clockLevels: ['hours'],
    }
    await putProfile(db, profile)
  } else if (profile.divisionEnabled === undefined || profile.arithEnabled === undefined || profile.clockEnabled === undefined || profile.clockLevels === undefined) {
    profile = {
      ...profile,
      divisionEnabled: profile.divisionEnabled ?? true,
      arithEnabled: profile.arithEnabled ?? true,
      clockEnabled: profile.clockEnabled ?? true,
      clockLevels: profile.clockLevels ?? ['hours'],
    }
    await putProfile(db, profile)
  }

  let cards = await getCardsForProfile(db, profile.id)

  const { migrated, changed } = migrateLegacyCards(cards)
  if (changed) await putCards(db, migrated)
  await syncCardsForProfile(db, profile)
  cards = await getCardsForProfile(db, profile.id)

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

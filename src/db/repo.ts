import { openDB, type IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION, type NasobikDB } from './schema'
import type { Profile, Card, Session } from '../core/types'

export async function openDb(): Promise<IDBPDatabase<NasobikDB>> {
  return openDB<NasobikDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('cards')) {
        const store = db.createObjectStore('cards', { keyPath: 'id' })
        store.createIndex('by-profile', 'profileId')
      }
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' })
        store.createIndex('by-profile', 'profileId')
      }
    },
  })
}

export async function putProfile(db: IDBPDatabase<NasobikDB>, profile: Profile): Promise<void> {
  await db.put('profiles', profile)
}

export async function getProfile(db: IDBPDatabase<NasobikDB>, id: string): Promise<Profile | undefined> {
  return db.get('profiles', id)
}

export async function putCards(db: IDBPDatabase<NasobikDB>, cards: Card[]): Promise<void> {
  const tx = db.transaction('cards', 'readwrite')
  await Promise.all(cards.map(c => tx.store.put(c)))
  await tx.done
}

export async function getCardsForProfile(db: IDBPDatabase<NasobikDB>, profileId: string): Promise<Card[]> {
  return db.getAllFromIndex('cards', 'by-profile', profileId)
}

export async function putSession(db: IDBPDatabase<NasobikDB>, session: Session): Promise<void> {
  await db.put('sessions', session)
}

// Reconciles the cards collection with a new unlockedTables list. Cards for
// tables that are no longer unlocked get removed; new cards are inserted for
// newly unlocked tables (initialised in Box 1). Cards on still-unlocked tables
// are left untouched so the child does not lose progress when toggling.
export async function syncCardsToUnlockedTables(
  db: IDBPDatabase<NasobikDB>,
  profileId: string,
  unlockedTables: number[],
): Promise<void> {
  const existing = await getCardsForProfile(db, profileId)
  const unlocked = new Set(unlockedTables)
  const toDelete = existing.filter(c => !unlocked.has(c.a))
  const keptIds = new Set(existing.filter(c => unlocked.has(c.a)).map(c => c.id))

  const newCards: Card[] = []
  for (const a of unlockedTables) {
    for (let b = 1; b <= 10; b++) {
      const id = `${profileId}:${a}x${b}`
      if (!keptIds.has(id)) {
        newCards.push({
          id,
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
  }

  const tx = db.transaction('cards', 'readwrite')
  await Promise.all(toDelete.map(c => tx.store.delete(c.id)))
  await Promise.all(newCards.map(c => tx.store.put(c)))
  await tx.done
}

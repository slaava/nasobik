import { openDB, type IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION, type NasobikDB } from './schema'
import type { Profile, Card, CardOp, Session } from '../core/types'
import { cardId } from '../core/cards'

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

export async function getSessionsForProfile(
  db: IDBPDatabase<NasobikDB>,
  profileId: string,
): Promise<Session[]> {
  return db.getAllFromIndex('sessions', 'by-profile', profileId)
}

// Reconciles the cards collection with a new (unlockedTables, divisionEnabled)
// state. Removes cards whose table is no longer unlocked and removes div cards
// when division is disabled. Inserts fresh Box-1 cards for newly required
// (table, op) combinations. Cards that should still exist are left untouched
// so the child does not lose Leitner progress when toggling.
export async function syncCardsToUnlockedTables(
  db: IDBPDatabase<NasobikDB>,
  profileId: string,
  unlockedTables: number[],
  divisionEnabled: boolean,
): Promise<void> {
  const existing = await getCardsForProfile(db, profileId)
  const unlocked = new Set(unlockedTables)
  const requiredOps: CardOp[] = divisionEnabled ? ['mul', 'div'] : ['mul']

  const isRequired = (c: Card) => unlocked.has(c.a) && requiredOps.includes(c.op)
  const toDelete = existing.filter(c => !isRequired(c))
  const keptIds = new Set(existing.filter(isRequired).map(c => c.id))

  const newCards: Card[] = []
  for (const a of unlockedTables) {
    for (let b = 1; b <= 10; b++) {
      for (const op of requiredOps) {
        const id = cardId(profileId, op, a, b)
        if (!keptIds.has(id)) {
          newCards.push({
            id,
            profileId,
            op,
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
  }

  const tx = db.transaction('cards', 'readwrite')
  await Promise.all(toDelete.map(c => tx.store.delete(c.id)))
  await Promise.all(newCards.map(c => tx.store.put(c)))
  await tx.done
}

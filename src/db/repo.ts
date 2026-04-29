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

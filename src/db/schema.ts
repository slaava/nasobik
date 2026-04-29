import type { DBSchema } from 'idb'
import type { Profile, Card, Session } from '../core/types'

export interface NasobikDB extends DBSchema {
  profiles: { key: string; value: Profile }
  cards: { key: string; value: Card; indexes: { 'by-profile': string } }
  sessions: { key: string; value: Session; indexes: { 'by-profile': string } }
}

export const DB_NAME = 'nasobik'
export const DB_VERSION = 1

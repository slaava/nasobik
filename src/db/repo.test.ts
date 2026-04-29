import { describe, it, expect, beforeEach } from 'vitest'
import { openDb, putProfile, getProfile, putCards, getCardsForProfile, putSession } from './repo'
import { generateCardsForTables } from '../core/cards'

beforeEach(async () => {
  indexedDB.deleteDatabase('nasobik')
})

describe('repo', () => {
  it('round-trips a profile', async () => {
    const db = await openDb()
    await putProfile(db, {
      id: 'p1',
      name: 'Anička',
      avatar: '🐝',
      createdAt: 1000,
      unlockedTables: [1, 2],
      selectedScene: 'bee',
    })
    const got = await getProfile(db, 'p1')
    expect(got?.name).toBe('Anička')
    db.close()
  })

  it('round-trips cards for a profile', async () => {
    const db = await openDb()
    const cards = generateCardsForTables('p1', [2])
    await putCards(db, cards)
    const got = await getCardsForProfile(db, 'p1')
    expect(got).toHaveLength(10)
    db.close()
  })

  it('persists a session', async () => {
    const db = await openDb()
    await putSession(db, {
      id: 's1',
      profileId: 'p1',
      startedAt: 0,
      endedAt: 1,
      answers: [{ a: 3, b: 7, correct: true, rt: 1500 }],
    })
    db.close()
  })
})

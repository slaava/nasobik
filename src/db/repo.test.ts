import { describe, it, expect, beforeEach } from 'vitest'
import {
  openDb,
  putProfile,
  getProfile,
  putCards,
  getCardsForProfile,
  putSession,
  syncCardsToUnlockedTables,
} from './repo'
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
      divisionEnabled: false,
    })
    const got = await getProfile(db, 'p1')
    expect(got?.name).toBe('Anička')
    db.close()
  })

  it('round-trips cards for a profile', async () => {
    const db = await openDb()
    const cards = generateCardsForTables('p1', [2], false)
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

describe('syncCardsToUnlockedTables', () => {
  it('adds cards for newly unlocked tables', async () => {
    const db = await openDb()
    await putCards(db, generateCardsForTables('p1', [2], false))
    await syncCardsToUnlockedTables(db, 'p1', [2, 3], false)
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(20)
    db.close()
  })

  it('removes cards for newly locked tables', async () => {
    const db = await openDb()
    await putCards(db, generateCardsForTables('p1', [2, 3], false))
    await syncCardsToUnlockedTables(db, 'p1', [2], false)
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.a === 2)).toBe(true)
    db.close()
  })

  it('preserves Leitner progress on still-unlocked cards', async () => {
    const db = await openDb()
    const initial = generateCardsForTables('p1', [2], false)
    initial[0]!.box = 4
    initial[0]!.totalSeen = 50
    initial[0]!.totalCorrect = 47
    await putCards(db, initial)
    await syncCardsToUnlockedTables(db, 'p1', [2, 3], false)
    const cards = await getCardsForProfile(db, 'p1')
    const preserved = cards.find(c => c.id === initial[0]!.id)!
    expect(preserved.box).toBe(4)
    expect(preserved.totalSeen).toBe(50)
    expect(preserved.totalCorrect).toBe(47)
    db.close()
  })

  it('handles empty unlockedTables (locks everything)', async () => {
    const db = await openDb()
    await putCards(db, generateCardsForTables('p1', [1, 2, 5], false))
    await syncCardsToUnlockedTables(db, 'p1', [], false)
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(0)
    db.close()
  })

  it('adds div cards when division is turned on, keeping mul progress', async () => {
    const db = await openDb()
    const initial = generateCardsForTables('p1', [2], false)
    initial[0]!.box = 5
    initial[0]!.totalSeen = 99
    await putCards(db, initial)
    await syncCardsToUnlockedTables(db, 'p1', [2], true)
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(20)
    expect(cards.filter(c => c.op === 'mul')).toHaveLength(10)
    expect(cards.filter(c => c.op === 'div')).toHaveLength(10)
    const preserved = cards.find(c => c.id === initial[0]!.id)!
    expect(preserved.box).toBe(5)
    expect(preserved.totalSeen).toBe(99)
    db.close()
  })

  it('removes div cards when division is turned off, keeping mul progress', async () => {
    const db = await openDb()
    const initial = generateCardsForTables('p1', [2], true)
    const mul3 = initial.find(c => c.op === 'mul' && c.a === 2 && c.b === 3)!
    mul3.box = 4
    mul3.totalCorrect = 12
    await putCards(db, initial)
    await syncCardsToUnlockedTables(db, 'p1', [2], false)
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.op === 'mul')).toBe(true)
    const preserved = cards.find(c => c.id === mul3.id)!
    expect(preserved.box).toBe(4)
    expect(preserved.totalCorrect).toBe(12)
    db.close()
  })
})

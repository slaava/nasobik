import { describe, it, expect, beforeEach } from 'vitest'
import { bootstrapDefaultProfile } from './bootstrap'
import { openDb, putProfile, putCards, getCardsForProfile } from './db/repo'
import type { Card, Profile } from './core/types'

beforeEach(() => {
  indexedDB.deleteDatabase('nasobik')
})

describe('bootstrapDefaultProfile', () => {
  it('creates the profile and cards on first run with division enabled', async () => {
    const result = await bootstrapDefaultProfile()
    expect(result.profile.name).toBe('Emička')
    expect(result.profile.unlockedTables).toEqual([1, 2, 5, 10])
    expect(result.profile.divisionEnabled).toBe(true)
    // 4 tables × 10 multipliers × 2 ops
    expect(result.cards).toHaveLength(80)
  })

  it('is idempotent across runs', async () => {
    await bootstrapDefaultProfile()
    const second = await bootstrapDefaultProfile()
    expect(second.profile.name).toBe('Emička')
    expect(second.cards).toHaveLength(80)
  })

  it('migrates legacy cards (no op field) to op="mul" and tops up div cards', async () => {
    // Simulate legacy IndexedDB state: profile without divisionEnabled, card without op.
    const db = await openDb()
    const legacyProfile = {
      id: 'anicka',
      name: 'Emička',
      avatar: '🐝',
      createdAt: 1,
      unlockedTables: [2],
      selectedScene: 'bee',
    } as unknown as Profile
    await putProfile(db, legacyProfile)
    const legacyCard = {
      id: 'anicka:2x3',
      profileId: 'anicka',
      a: 2,
      b: 3,
      box: 4,
      exposuresSinceLastSeen: 0,
      sessionsSinceLastSeen: 0,
      lastRT: 1500,
      totalSeen: 12,
      totalCorrect: 10,
    } as unknown as Card
    await putCards(db, [legacyCard])
    db.close()

    const result = await bootstrapDefaultProfile()
    expect(result.profile.divisionEnabled).toBe(true)

    const db2 = await openDb()
    const stored = await getCardsForProfile(db2, 'anicka')
    db2.close()

    const migrated = stored.find(c => c.id === 'anicka:2x3')!
    expect(migrated.op).toBe('mul')
    expect(migrated.box).toBe(4)
    expect(migrated.totalSeen).toBe(12)
    expect(stored.filter(c => c.op === 'div').length).toBe(10)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { bootstrapDefaultProfile } from './bootstrap'
import { openDb, putProfile, putCards, getCardsForProfile, getProfile } from './db/repo'
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

describe('arithmetic profile migration', () => {
  it('enables arithmetic on a fresh profile and persists it', async () => {
    const { profile } = await bootstrapDefaultProfile()
    expect(profile.arithEnabled).toBe(true)
    const db = await openDb()
    try {
      expect((await getProfile(db, profile.id))?.arithEnabled).toBe(true)
    } finally {
      db.close()
    }
  })

  it.each([false, undefined])('migrates a legacy profile with divisionEnabled=%s', async divisionEnabled => {
    const db = await openDb()
    await putProfile(db, {
      id: 'anicka', name: 'Emička', avatar: '🐝', createdAt: 1,
      unlockedTables: [2], selectedScene: 'bee', divisionEnabled,
    } as Profile)
    db.close()
    const { profile } = await bootstrapDefaultProfile()
    expect(profile.arithEnabled).toBe(true)
    expect(profile.divisionEnabled).toBe(divisionEnabled ?? true)
    const checkDb = await openDb()
    try {
      expect(await getProfile(checkDb, 'anicka')).toEqual(profile)
    } finally {
      checkDb.close()
    }
  })

  it('preserves explicitly disabled arithmetic across boots', async () => {
    const { profile } = await bootstrapDefaultProfile()
    const db = await openDb()
    await putProfile(db, { ...profile, arithEnabled: false })
    db.close()
    expect((await bootstrapDefaultProfile()).profile.arithEnabled).toBe(false)
  })
})

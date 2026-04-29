import { describe, it, expect, beforeEach } from 'vitest'
import { bootstrapDefaultProfile } from './bootstrap'

beforeEach(() => {
  indexedDB.deleteDatabase('nasobik')
})

describe('bootstrapDefaultProfile', () => {
  it('creates the profile and cards on first run', async () => {
    const result = await bootstrapDefaultProfile()
    expect(result.profile.name).toBe('Anička')
    expect(result.profile.unlockedTables).toEqual([1, 2, 5, 10])
    expect(result.cards).toHaveLength(40)
  })

  it('is idempotent across runs', async () => {
    await bootstrapDefaultProfile()
    const second = await bootstrapDefaultProfile()
    expect(second.profile.name).toBe('Anička')
    expect(second.cards).toHaveLength(40)
  })
})

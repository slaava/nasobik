# Násobík Phase 2 Implementation Plan — "Usable for real life"

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the Phase 1 MVP into something a real family can use, and that other parents can be invited to try. Add multi-profile support, a parent-only view (math gate, table unlocking, heatmap, summary stats), forgiving streaks, a child-facing "Co umím" view, mute toggle, and profile deletion.

**Architecture:** Builds on Phase 1. Adds a top-level router-less navigation (state-based screens — no router until Phase 3 if needed). Profile selection becomes the entry screen. The existing `SessionScreen` and `SessionSummary` are reused unchanged. Parent view is gated behind a math challenge.

**Tech Stack:** Same as Phase 1 (no new deps).

**Reference:** See `docs/plans/2026-04-29-nasobik-design.md` for design rationale and `docs/plans/2026-04-29-nasobik-phase1-mvp.md` for the foundation this builds on.

**Prerequisite:** Phase 1 plan complete and merged.

---

## Scope of Phase 2

**In scope:**
- Profile selection screen (Netflix-style)
- Profile creation form (name + emoji avatar)
- Multi-profile data isolation (already enforced by `profileId` on Card/Session)
- Parent view, gated by a math challenge (e.g., "47 + 28 = ?")
- Parent view UI: table unlock checkboxes, 10×10 heatmap colored by Leitner box, today/week summary, delete profile
- When tables are unlocked/locked, regenerate cards correctly (do not destroy existing progress)
- Streak counter with 1 free day per ISO week
- "Co umím" view for child (color-coded grid, no numbers)
- Mute toggle for sounds (and add minimal sound effects)
- Add 1 simple sound for correct, 1 for wrong, optional via `<audio>` (royalty-free)

**Out of scope (Phase 3):**
- PWA, second scene, polished SVG, hosting, decorative meadow items

---

## Conventions

- Same as Phase 1: Vitest, Czech UI, English code, commit per task, TDD where it pays off.
- New screens get at least one render test.
- Existing tests must keep passing — run `npm test` after every task.

---

## Task 1: Generalize bootstrap into profile-aware repository helpers

**Files:**
- Modify: `src/db/repo.ts`
- Create: `src/db/repo.test.ts` additions
- Modify: `src/bootstrap.ts`, `src/bootstrap.test.ts`

**Background:** Phase 1 hardcoded one profile. We need:
- `listProfiles()` — return all profiles
- `deleteProfile(id)` — remove profile + its cards + its sessions
- `syncCardsToUnlockedTables(profileId, unlockedTables)` — when unlock toggles change, add new cards (initialized to box 1) and remove cards whose `a` is no longer unlocked. **Preserves progress on still-unlocked tables.**

**Step 1: Add failing tests**

Append to `src/db/repo.test.ts`:

```ts
import { listProfiles, deleteProfile, syncCardsToUnlockedTables, getSessionsForProfile } from './repo'

describe('listProfiles', () => {
  it('returns all profiles', async () => {
    const db = await openDb()
    await putProfile(db, { id: 'p1', name: 'A', avatar: '🐝', createdAt: 1, unlockedTables: [], selectedScene: 'bee' })
    await putProfile(db, { id: 'p2', name: 'B', avatar: '🌻', createdAt: 2, unlockedTables: [], selectedScene: 'bee' })
    const list = await listProfiles(db)
    expect(list).toHaveLength(2)
  })
})

describe('deleteProfile', () => {
  it('removes profile, cards, and sessions', async () => {
    const db = await openDb()
    await putProfile(db, { id: 'p1', name: 'A', avatar: '🐝', createdAt: 1, unlockedTables: [], selectedScene: 'bee' })
    await putCards(db, generateCardsForTables('p1', [1]))
    await putSession(db, { id: 's1', profileId: 'p1', startedAt: 0, endedAt: 1, answers: [] })
    await deleteProfile(db, 'p1')
    expect(await getProfile(db, 'p1')).toBeUndefined()
    expect(await getCardsForProfile(db, 'p1')).toEqual([])
    expect(await getSessionsForProfile(db, 'p1')).toEqual([])
  })
})

describe('syncCardsToUnlockedTables', () => {
  it('adds new cards for newly unlocked tables', async () => {
    const db = await openDb()
    await putCards(db, generateCardsForTables('p1', [2]))
    await syncCardsToUnlockedTables(db, 'p1', [2, 3])
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(20)
  })

  it('removes cards for newly locked tables', async () => {
    const db = await openDb()
    await putCards(db, generateCardsForTables('p1', [2, 3]))
    await syncCardsToUnlockedTables(db, 'p1', [2])
    const cards = await getCardsForProfile(db, 'p1')
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.a === 2)).toBe(true)
  })

  it('preserves Leitner progress on still-unlocked cards', async () => {
    const db = await openDb()
    const initial = generateCardsForTables('p1', [2])
    initial[0].box = 4
    initial[0].totalSeen = 50
    await putCards(db, initial)
    await syncCardsToUnlockedTables(db, 'p1', [2, 3])
    const cards = await getCardsForProfile(db, 'p1')
    const preserved = cards.find(c => c.id === initial[0].id)!
    expect(preserved.box).toBe(4)
    expect(preserved.totalSeen).toBe(50)
  })
})
```

**Step 2: Implement helpers**

Add to `src/db/repo.ts`:

```ts
export async function listProfiles(db: IDBPDatabase<NasobikDB>): Promise<Profile[]> {
  return db.getAll('profiles')
}

export async function getSessionsForProfile(
  db: IDBPDatabase<NasobikDB>,
  profileId: string,
): Promise<Session[]> {
  return db.getAllFromIndex('sessions', 'by-profile', profileId)
}

export async function deleteProfile(
  db: IDBPDatabase<NasobikDB>,
  profileId: string,
): Promise<void> {
  const tx = db.transaction(['profiles', 'cards', 'sessions'], 'readwrite')
  await tx.objectStore('profiles').delete(profileId)
  const cardKeys = await tx.objectStore('cards').index('by-profile').getAllKeys(profileId)
  await Promise.all(cardKeys.map(k => tx.objectStore('cards').delete(k)))
  const sessKeys = await tx.objectStore('sessions').index('by-profile').getAllKeys(profileId)
  await Promise.all(sessKeys.map(k => tx.objectStore('sessions').delete(k)))
  await tx.done
}

export async function syncCardsToUnlockedTables(
  db: IDBPDatabase<NasobikDB>,
  profileId: string,
  unlockedTables: number[],
): Promise<void> {
  const existing = await getCardsForProfile(db, profileId)
  const unlocked = new Set(unlockedTables)
  const toDelete = existing.filter(c => !unlocked.has(c.a))
  const have = new Set(existing.filter(c => unlocked.has(c.a)).map(c => c.id))

  const newCards: Card[] = []
  for (const a of unlockedTables) {
    for (let b = 1; b <= 10; b++) {
      const id = `${profileId}:${a}x${b}`
      if (!have.has(id)) {
        newCards.push({
          id, profileId, a, b, box: 1,
          exposuresSinceLastSeen: 0, sessionsSinceLastSeen: 0,
          lastRT: null, totalSeen: 0, totalCorrect: 0,
        })
      }
    }
  }

  const tx = db.transaction('cards', 'readwrite')
  await Promise.all(toDelete.map(c => tx.store.delete(c.id)))
  await Promise.all(newCards.map(c => tx.store.put(c)))
  await tx.done
}
```

(Add `import { generateCardsForTables } from '../core/cards'` to the test file if it's not already there.)

**Step 3: Update bootstrap to use these (no behavior change for existing test)**

Bootstrap test stays as-is. The `bootstrapDefaultProfile` is now just one of several entry paths; we'll add `bootstrapApp()` next that returns all profiles.

**Step 4: Run tests**

Run: `npm test`
Expected: all green (existing + new).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: profile-aware repo helpers (list/delete/sync)"
```

---

## Task 2: Add streak field to Profile + helper

**Files:**
- Modify: `src/core/types.ts`
- Create: `src/core/streak.ts`
- Create: `src/core/streak.test.ts`
- Modify: `src/bootstrap.ts` (initialize streak object)

**Background:** Streak is incremented when the user finishes ≥1 session on a calendar day they hadn't previously played. Missing a day breaks the streak — except the user gets one "free day" per ISO week. Implementation is a pure function `applyPlayedToday(streak, todayISO)` returning `{ current, lastPlayedDate, freeDayUsedThisWeek }`.

**Step 1: Define type and write failing tests**

Add to `Profile` in `src/core/types.ts`:

```ts
streak: {
  current: number
  lastPlayedDate: string | null  // ISO date 'YYYY-MM-DD'
  freeDayUsedThisWeek: boolean
  lastWeekKey: string | null     // 'YYYY-Www' for tracking week resets
}
```

Create `src/core/streak.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyPlayedToday, isoWeekKey } from './streak'
import type { Profile } from './types'

const emptyStreak: Profile['streak'] = {
  current: 0,
  lastPlayedDate: null,
  freeDayUsedThisWeek: false,
  lastWeekKey: null,
}

describe('applyPlayedToday', () => {
  it('first play sets streak to 1', () => {
    const s = applyPlayedToday(emptyStreak, '2026-04-29')
    expect(s.current).toBe(1)
    expect(s.lastPlayedDate).toBe('2026-04-29')
  })

  it('same-day replay does not double-count', () => {
    const s1 = applyPlayedToday(emptyStreak, '2026-04-29')
    const s2 = applyPlayedToday(s1, '2026-04-29')
    expect(s2.current).toBe(1)
  })

  it('next-day play increments streak', () => {
    const s1 = applyPlayedToday(emptyStreak, '2026-04-29')
    const s2 = applyPlayedToday(s1, '2026-04-30')
    expect(s2.current).toBe(2)
  })

  it('skipping a day breaks the streak (free day not yet used)', () => {
    const s1 = applyPlayedToday(emptyStreak, '2026-04-29')
    const s2 = applyPlayedToday(s1, '2026-05-01') // skipped April 30
    expect(s2.current).toBe(2) // free day consumed, streak preserved
    expect(s2.freeDayUsedThisWeek).toBe(true)
  })

  it('skipping a day breaks the streak when free day already used', () => {
    const used: Profile['streak'] = {
      current: 5,
      lastPlayedDate: '2026-04-29',
      freeDayUsedThisWeek: true,
      lastWeekKey: isoWeekKey(new Date('2026-04-29')),
    }
    const s = applyPlayedToday(used, '2026-05-01')
    expect(s.current).toBe(1) // reset
    expect(s.freeDayUsedThisWeek).toBe(true)
  })

  it('crossing a week boundary resets freeDayUsedThisWeek', () => {
    const used: Profile['streak'] = {
      current: 5,
      lastPlayedDate: '2026-04-29',  // Wed of one week
      freeDayUsedThisWeek: true,
      lastWeekKey: isoWeekKey(new Date('2026-04-29')),
    }
    const s = applyPlayedToday(used, '2026-05-04') // Mon of next ISO week
    expect(s.freeDayUsedThisWeek).toBe(false)
  })
})

describe('isoWeekKey', () => {
  it('returns YYYY-Www format', () => {
    expect(isoWeekKey(new Date('2026-04-29'))).toMatch(/^2026-W\d{2}$/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- streak`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/core/streak.ts`:

```ts
import type { Profile } from './types'

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime()
  const b = new Date(to + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86400000)
}

export function isoWeekKey(d: Date): string {
  // ISO week: Monday-start, week 1 is the week containing Jan 4.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function applyPlayedToday(
  streak: Profile['streak'],
  todayISO: string,
): Profile['streak'] {
  const todayWeek = isoWeekKey(new Date(todayISO + 'T00:00:00Z'))
  const weekRolledOver = streak.lastWeekKey !== todayWeek
  const freeDayUsedThisWeek = weekRolledOver ? false : streak.freeDayUsedThisWeek

  if (streak.lastPlayedDate === null) {
    return { current: 1, lastPlayedDate: todayISO, freeDayUsedThisWeek, lastWeekKey: todayWeek }
  }
  if (streak.lastPlayedDate === todayISO) {
    return { ...streak, freeDayUsedThisWeek, lastWeekKey: todayWeek }
  }

  const gap = daysBetween(streak.lastPlayedDate, todayISO)
  if (gap === 1) {
    return { current: streak.current + 1, lastPlayedDate: todayISO, freeDayUsedThisWeek, lastWeekKey: todayWeek }
  }
  if (gap === 2 && !freeDayUsedThisWeek) {
    return { current: streak.current + 1, lastPlayedDate: todayISO, freeDayUsedThisWeek: true, lastWeekKey: todayWeek }
  }
  return { current: 1, lastPlayedDate: todayISO, freeDayUsedThisWeek, lastWeekKey: todayWeek }
}
```

**Step 4: Update bootstrap default streak**

In `src/bootstrap.ts`, when creating the profile, initialize:

```ts
streak: { current: 0, lastPlayedDate: null, freeDayUsedThisWeek: false, lastWeekKey: null }
```

**Step 5: Run tests**

Run: `npm test -- streak`
Expected: 7 passing.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: streak with forgiving 1-free-day-per-week"
```

---

## Task 3: Profile selection screen

**Files:**
- Create: `src/ui/ProfilePicker.tsx`
- Create: `src/ui/ProfilePicker.test.tsx`

**Behavior:** Receives `profiles` and callbacks `onSelect`, `onCreate`, `onOpenParent`. Renders a tile per profile (avatar + name) and a "+ Nový profil" tile. A small gear icon in a corner triggers `onOpenParent`.

**Step 1: Write failing test**

Create `src/ui/ProfilePicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePicker } from './ProfilePicker'
import type { Profile } from '../core/types'

const profile = (id: string, name: string): Profile => ({
  id, name, avatar: '🐝', createdAt: 0, unlockedTables: [],
  selectedScene: 'bee',
  streak: { current: 0, lastPlayedDate: null, freeDayUsedThisWeek: false, lastWeekKey: null },
})

describe('ProfilePicker', () => {
  it('renders a tile for each profile', () => {
    render(
      <ProfilePicker
        profiles={[profile('p1', 'Anička'), profile('p2', 'Tomáš')]}
        onSelect={() => {}}
        onCreate={() => {}}
        onOpenParent={() => {}}
      />,
    )
    expect(screen.getByText('Anička')).toBeInTheDocument()
    expect(screen.getByText('Tomáš')).toBeInTheDocument()
  })

  it('calls onSelect when a profile tile is clicked', async () => {
    const onSelect = vi.fn()
    render(
      <ProfilePicker
        profiles={[profile('p1', 'Anička')]}
        onSelect={onSelect}
        onCreate={() => {}}
        onOpenParent={() => {}}
      />,
    )
    await userEvent.click(screen.getByText('Anička'))
    expect(onSelect).toHaveBeenCalledWith('p1')
  })

  it('calls onCreate when + tile is clicked', async () => {
    const onCreate = vi.fn()
    render(
      <ProfilePicker profiles={[]} onSelect={() => {}} onCreate={onCreate} onOpenParent={() => {}} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /nový profil/i }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('has a parent gear button that calls onOpenParent', async () => {
    const onOpenParent = vi.fn()
    render(
      <ProfilePicker profiles={[]} onSelect={() => {}} onCreate={() => {}} onOpenParent={onOpenParent} />,
    )
    await userEvent.click(screen.getByRole('button', { name: /pro rodiče/i }))
    expect(onOpenParent).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ProfilePicker`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/ui/ProfilePicker.tsx`:

```tsx
import type { Profile } from '../core/types'

type Props = {
  profiles: Profile[]
  onSelect: (id: string) => void
  onCreate: () => void
  onOpenParent: () => void
}

export function ProfilePicker({ profiles, onSelect, onCreate, onOpenParent }: Props) {
  return (
    <div className="flex flex-col h-full bg-amber-50 p-8">
      <header className="flex justify-end">
        <button
          type="button"
          onClick={onOpenParent}
          aria-label="Pro rodiče"
          className="text-2xl opacity-50 hover:opacity-100"
        >
          ⚙️
        </button>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <h1 className="text-3xl font-bold text-amber-900">Kdo bude krmit včelku?</h1>
        <div className="flex flex-wrap justify-center gap-6">
          {profiles.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 shadow-md w-32 active:scale-95 transition"
            >
              <span className="text-6xl">{p.avatar}</span>
              <span className="text-lg font-semibold text-amber-900">{p.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onCreate}
            aria-label="Nový profil"
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-amber-100 p-6 w-32 h-full active:scale-95 transition border-2 border-dashed border-amber-400"
          >
            <span className="text-6xl">+</span>
            <span className="text-lg font-semibold text-amber-900">Nový</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- ProfilePicker`
Expected: 4 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: ProfilePicker screen"
```

---

## Task 4: Profile creation form

**Files:**
- Create: `src/ui/ProfileCreate.tsx`
- Create: `src/ui/ProfileCreate.test.tsx`

**Behavior:** Simple form: text input for name, grid of emoji avatars to pick from, Create / Cancel buttons. Calls `onCreate({ name, avatar })`.

**Step 1: Write failing test**

Create `src/ui/ProfileCreate.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileCreate } from './ProfileCreate'

describe('ProfileCreate', () => {
  it('disables create button when name is empty', () => {
    render(<ProfileCreate onCreate={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('button', { name: /vytvořit/i })).toBeDisabled()
  })

  it('calls onCreate with name and selected avatar', async () => {
    const onCreate = vi.fn()
    render(<ProfileCreate onCreate={onCreate} onCancel={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/jméno/i), 'Anička')
    await userEvent.click(screen.getByRole('button', { name: '🌻' }))
    await userEvent.click(screen.getByRole('button', { name: /vytvořit/i }))
    expect(onCreate).toHaveBeenCalledWith({ name: 'Anička', avatar: '🌻' })
  })

  it('cancel button calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<ProfileCreate onCreate={() => {}} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /zrušit/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ProfileCreate`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/ui/ProfileCreate.tsx`:

```tsx
import { useState } from 'react'

const AVATARS = ['🐝', '🌻', '🦊', '🐰', '🐢', '🦋', '🐱', '🐶', '🦄', '🐸']

type Props = {
  onCreate: (input: { name: string; avatar: string }) => void
  onCancel: () => void
}

export function ProfileCreate({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🐝')
  const trimmed = name.trim()

  return (
    <div className="flex flex-col h-full bg-amber-50 p-8 gap-6 items-center">
      <h1 className="text-3xl font-bold text-amber-900">Nový profil</h1>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Jméno"
        className="text-2xl rounded-2xl bg-white px-6 py-4 shadow w-full max-w-md text-amber-900"
        maxLength={20}
      />
      <div className="grid grid-cols-5 gap-3 max-w-md">
        {AVATARS.map(a => (
          <button
            key={a}
            type="button"
            aria-label={a}
            onClick={() => setAvatar(a)}
            className={`text-4xl p-3 rounded-2xl transition ${
              avatar === a ? 'bg-amber-300 ring-4 ring-amber-500' : 'bg-white hover:bg-amber-100'
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mt-auto">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-white text-amber-900 py-3 px-6 shadow font-semibold"
        >
          Zrušit
        </button>
        <button
          type="button"
          disabled={trimmed.length === 0}
          onClick={() => onCreate({ name: trimmed, avatar })}
          className="rounded-2xl bg-amber-500 text-white py-3 px-6 shadow font-bold disabled:opacity-40"
        >
          Vytvořit
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- ProfileCreate`
Expected: 3 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: ProfileCreate form"
```

---

## Task 5: Math gate for parent view

**Files:**
- Create: `src/ui/ParentGate.tsx`
- Create: `src/ui/ParentGate.test.tsx`

**Behavior:** Shows a 2-digit + 2-digit addition (e.g., `47 + 28 = ?`). User types answer and submits. Right answer fires `onUnlock`. Wrong answer shows a soft retry. Numbers picked once on mount.

**Step 1: Write failing test**

Create `src/ui/ParentGate.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentGate } from './ParentGate'

describe('ParentGate', () => {
  it('unlocks on correct answer', async () => {
    const onUnlock = vi.fn()
    render(<ParentGate onUnlock={onUnlock} onCancel={() => {}} />)
    const heading = screen.getByRole('heading', { level: 1 })
    const m = heading.textContent!.match(/(\d+)\s*\+\s*(\d+)/)!
    const sum = Number(m[1]) + Number(m[2])
    await userEvent.type(screen.getByRole('textbox'), String(sum))
    await userEvent.click(screen.getByRole('button', { name: /pokračovat/i }))
    expect(onUnlock).toHaveBeenCalled()
  })

  it('does not unlock on wrong answer', async () => {
    const onUnlock = vi.fn()
    render(<ParentGate onUnlock={onUnlock} onCancel={() => {}} />)
    await userEvent.type(screen.getByRole('textbox'), '0')
    await userEvent.click(screen.getByRole('button', { name: /pokračovat/i }))
    expect(onUnlock).not.toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ParentGate`
Expected: FAIL.

**Step 3: Implement**

Create `src/ui/ParentGate.tsx`:

```tsx
import { useMemo, useState } from 'react'

type Props = {
  onUnlock: () => void
  onCancel: () => void
}

function rand2() {
  return Math.floor(Math.random() * 80) + 11 // 11..90
}

export function ParentGate({ onUnlock, onCancel }: Props) {
  const { a, b } = useMemo(() => ({ a: rand2(), b: rand2() }), [])
  const [input, setInput] = useState('')
  const [err, setErr] = useState(false)

  const submit = () => {
    if (Number(input) === a + b) onUnlock()
    else { setErr(true); setInput('') }
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 p-8 gap-6 items-center justify-center">
      <h1 className="text-4xl font-bold text-amber-900">{a} + {b} = ?</h1>
      <p className="text-amber-700">Tato část je pro rodiče.</p>
      <input
        type="text"
        inputMode="numeric"
        value={input}
        onChange={e => { setInput(e.target.value.replace(/\D/g, '')); setErr(false) }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
        className={`text-3xl rounded-2xl bg-white px-6 py-4 shadow w-48 text-center text-amber-900 ${err ? 'ring-4 ring-red-300' : ''}`}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl bg-white text-amber-900 py-3 px-6 shadow font-semibold"
        >
          Zpět
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-2xl bg-amber-500 text-white py-3 px-6 shadow font-bold"
        >
          Pokračovat
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- ParentGate`
Expected: 2 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: ParentGate math challenge"
```

---

## Task 6: Heatmap component (10×10 colored grid)

**Files:**
- Create: `src/ui/Heatmap.tsx`
- Create: `src/ui/Heatmap.test.tsx`

**Behavior:** Receives `cards: Card[]`. Renders a 10×10 grid where row = `a` (1-10), column = `b` (1-10). Cell color comes from a `boxColor()` mapping. Cells without a corresponding card are gray ("locked / not yet seen"). Optional: tooltip on hover/tap.

**Step 1: Write failing test**

Create `src/ui/Heatmap.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Heatmap } from './Heatmap'
import { generateCardsForTables } from '../core/cards'

describe('Heatmap', () => {
  it('renders 100 cells', () => {
    const { container } = render(<Heatmap cards={[]} />)
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(100)
  })

  it('cells with cards get colored, others stay gray', () => {
    const cards = generateCardsForTables('p1', [3])
    const { container } = render(<Heatmap cards={cards} />)
    const colored = container.querySelectorAll('[data-cell][data-box="1"]')
    expect(colored).toHaveLength(10)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- Heatmap`
Expected: FAIL.

**Step 3: Implement**

Create `src/ui/Heatmap.tsx`:

```tsx
import type { Card } from '../core/types'

const BOX_COLOR: Record<number, string> = {
  0: 'bg-gray-200',     // no card
  1: 'bg-red-300',
  2: 'bg-orange-300',
  3: 'bg-yellow-300',
  4: 'bg-lime-400',
  5: 'bg-green-600',
}

type Props = {
  cards: Card[]
}

export function Heatmap({ cards }: Props) {
  const byKey = new Map<string, Card>()
  for (const c of cards) byKey.set(`${c.a}-${c.b}`, c)

  return (
    <div className="inline-block bg-white rounded-2xl p-3 shadow">
      <div className="grid grid-cols-11 gap-1 text-xs">
        <div></div>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(b => (
          <div key={b} className="text-center text-amber-800 font-semibold">{b}</div>
        ))}
        {Array.from({ length: 10 }, (_, i) => i + 1).map(a => (
          <div key={a} className="contents">
            <div className="text-center text-amber-800 font-semibold py-1">{a}</div>
            {Array.from({ length: 10 }, (_, j) => j + 1).map(b => {
              const card = byKey.get(`${a}-${b}`)
              const box = card?.box ?? 0
              return (
                <div
                  key={b}
                  data-cell
                  data-box={box}
                  title={card ? `${a} × ${b} = ${a * b} · viděno ${card.totalSeen}× · správně ${card.totalCorrect}×` : `${a} × ${b} = ${a * b} (zamčeno)`}
                  className={`w-7 h-7 rounded ${BOX_COLOR[box]}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- Heatmap`
Expected: 2 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: Heatmap component with Leitner-box colors"
```

---

## Task 7: Parent view — table unlock + heatmap + summary + delete

**Files:**
- Create: `src/ui/ParentView.tsx`
- Create: `src/ui/ParentView.test.tsx`

**Behavior:** Renders profile selector at top (radio-like). For the selected profile shows: table unlock checkboxes, heatmap, summary stats (today, this week), delete button (typed-name confirmation). Calls back into App for state mutations.

**Step 1: Write failing test (focused)**

Create `src/ui/ParentView.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParentView } from './ParentView'
import type { Profile } from '../core/types'
import { generateCardsForTables } from '../core/cards'

const profile: Profile = {
  id: 'p1', name: 'Anička', avatar: '🐝', createdAt: 0,
  unlockedTables: [2], selectedScene: 'bee',
  streak: { current: 0, lastPlayedDate: null, freeDayUsedThisWeek: false, lastWeekKey: null },
}

describe('ParentView', () => {
  it('renders unlock checkboxes for all 10 tables', () => {
    render(
      <ParentView
        profiles={[profile]}
        cardsByProfile={{ p1: generateCardsForTables('p1', [2]) }}
        sessionsByProfile={{ p1: [] }}
        onUnlockChange={() => {}}
        onDeleteProfile={() => {}}
        onClose={() => {}}
      />,
    )
    for (let n = 1; n <= 10; n++) {
      expect(screen.getByLabelText(`${n}×`)).toBeInTheDocument()
    }
  })

  it('toggling a checkbox calls onUnlockChange with the new array', async () => {
    const onUnlockChange = vi.fn()
    render(
      <ParentView
        profiles={[profile]}
        cardsByProfile={{ p1: [] }}
        sessionsByProfile={{ p1: [] }}
        onUnlockChange={onUnlockChange}
        onDeleteProfile={() => {}}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByLabelText('3×'))
    expect(onUnlockChange).toHaveBeenCalledWith('p1', expect.arrayContaining([2, 3]))
  })

  it('delete requires typed-name confirmation', async () => {
    const onDeleteProfile = vi.fn()
    render(
      <ParentView
        profiles={[profile]}
        cardsByProfile={{ p1: [] }}
        sessionsByProfile={{ p1: [] }}
        onUnlockChange={() => {}}
        onDeleteProfile={onDeleteProfile}
        onClose={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /smazat profil/i }))
    await userEvent.type(screen.getByPlaceholderText(/napište jméno/i), 'Anička')
    await userEvent.click(screen.getByRole('button', { name: /potvrdit smazání/i }))
    expect(onDeleteProfile).toHaveBeenCalledWith('p1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ParentView`
Expected: FAIL.

**Step 3: Implement**

Create `src/ui/ParentView.tsx`:

```tsx
import { useMemo, useState } from 'react'
import type { Card, Profile, Session } from '../core/types'
import { Heatmap } from './Heatmap'

type Props = {
  profiles: Profile[]
  cardsByProfile: Record<string, Card[]>
  sessionsByProfile: Record<string, Session[]>
  onUnlockChange: (profileId: string, unlocked: number[]) => void
  onDeleteProfile: (profileId: string) => void
  onClose: () => void
}

export function ParentView({
  profiles, cardsByProfile, sessionsByProfile,
  onUnlockChange, onDeleteProfile, onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(profiles[0]?.id ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')

  const profile = profiles.find(p => p.id === selectedId)
  const cards = profile ? (cardsByProfile[profile.id] ?? []) : []
  const sessions = profile ? (sessionsByProfile[profile.id] ?? []) : []

  const stats = useMemo(() => statsFor(sessions), [sessions])

  if (!profile) {
    return (
      <div className="p-8 bg-amber-50 h-full">
        <button onClick={onClose} className="text-amber-700 underline">Zpět</button>
        <p className="mt-4">Žádné profily.</p>
      </div>
    )
  }

  const toggleTable = (n: number) => {
    const next = profile.unlockedTables.includes(n)
      ? profile.unlockedTables.filter(x => x !== n)
      : [...profile.unlockedTables, n].sort((x, y) => x - y)
    onUnlockChange(profile.id, next)
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 p-6 gap-6 overflow-y-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">Pro rodiče</h1>
        <button onClick={onClose} className="text-amber-700 underline">Zpět</button>
      </header>

      {profiles.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`px-4 py-2 rounded-2xl ${
                selectedId === p.id ? 'bg-amber-500 text-white' : 'bg-white text-amber-900'
              }`}
            >
              {p.avatar} {p.name}
            </button>
          ))}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-amber-900 mb-2">Řady násobilky</h2>
        <p className="text-sm text-amber-700 mb-3">Odemkni řady tak, jak je dcera/syn probírá ve škole.</p>
        <div className="grid grid-cols-5 gap-2 max-w-md">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <label key={n} className="flex items-center gap-2 bg-white p-2 rounded-xl shadow">
              <input
                type="checkbox"
                aria-label={`${n}×`}
                checked={profile.unlockedTables.includes(n)}
                onChange={() => toggleTable(n)}
                className="w-5 h-5"
              />
              <span className="font-semibold text-amber-900">{n}×</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-amber-900 mb-2">Jak to jde</h2>
        <Heatmap cards={cards} />
        <div className="mt-3 text-sm text-amber-800">
          <div>Dnes: {stats.today.count} příkladů, {stats.today.correctPct}% správně, {stats.today.minutes} min</div>
          <div>Tento týden: {stats.week.sessions} sezení, streak {profile.streak.current} {profile.streak.current === 1 ? 'den' : 'dní'}</div>
        </div>
      </section>

      <section className="mt-auto">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-red-600 underline text-sm"
          >
            Smazat profil
          </button>
        ) : (
          <div className="space-y-2 bg-red-50 p-4 rounded-xl">
            <p className="text-sm text-red-800">
              Opravdu smazat? Pro potvrzení napište jméno profilu: <strong>{profile.name}</strong>
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="Napište jméno profilu"
              className="w-full rounded-lg p-2 bg-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); setConfirmInput('') }}
                className="rounded-xl bg-white py-2 px-4 text-amber-900"
              >
                Zrušit
              </button>
              <button
                type="button"
                disabled={confirmInput !== profile.name}
                onClick={() => onDeleteProfile(profile.id)}
                className="rounded-xl bg-red-500 text-white py-2 px-4 disabled:opacity-40"
              >
                Potvrdit smazání
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function statsFor(sessions: Session[]) {
  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter(s => new Date(s.startedAt).toISOString().slice(0, 10) === today)
  const todayAnswers = todaySessions.flatMap(s => s.answers)
  const todayCorrect = todayAnswers.filter(a => a.correct).length
  const todayMs = todaySessions.reduce((sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt), 0)

  const oneWeekAgo = Date.now() - 7 * 86400000
  const weekSessions = sessions.filter(s => s.startedAt >= oneWeekAgo)

  return {
    today: {
      count: todayAnswers.length,
      correctPct: todayAnswers.length === 0 ? 0 : Math.round((todayCorrect / todayAnswers.length) * 100),
      minutes: Math.round(todayMs / 60000),
    },
    week: {
      sessions: weekSessions.length,
    },
  }
}
```

**Step 4: Run tests**

Run: `npm test -- ParentView`
Expected: 3 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: ParentView with unlock, heatmap, stats, delete"
```

---

## Task 8: "Co umím" view for child

**Files:**
- Create: `src/ui/ChildProgress.tsx`
- Create: `src/ui/ChildProgress.test.tsx`

**Behavior:** Reuses `Heatmap` but with no numbers/labels — just the colored grid. Shown when child taps "Co umím" on home. A simple Back button returns to home.

**Step 1: Write failing test**

Create `src/ui/ChildProgress.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildProgress } from './ChildProgress'

describe('ChildProgress', () => {
  it('renders the heatmap and a back button', () => {
    const { container } = render(<ChildProgress cards={[]} onBack={() => {}} />)
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(100)
    expect(screen.getByRole('button', { name: /zpět/i })).toBeInTheDocument()
  })

  it('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(<ChildProgress cards={[]} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /zpět/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ChildProgress`
Expected: FAIL.

**Step 3: Implement**

Create `src/ui/ChildProgress.tsx`:

```tsx
import type { Card } from '../core/types'
import { Heatmap } from './Heatmap'

type Props = {
  cards: Card[]
  onBack: () => void
}

export function ChildProgress({ cards, onBack }: Props) {
  return (
    <div className="flex flex-col h-full bg-amber-50 p-6 gap-6 items-center">
      <h1 className="text-3xl font-bold text-amber-900">Co umím</h1>
      <Heatmap cards={cards} />
      <button
        type="button"
        onClick={onBack}
        className="rounded-2xl bg-amber-500 text-white py-3 px-6 shadow font-bold mt-auto"
      >
        Zpět
      </button>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- ChildProgress`
Expected: 2 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: ChildProgress view"
```

---

## Task 9: Mute toggle and minimal sound effects

**Files:**
- Create: `src/lib/sounds.ts`
- Create: `public/sounds/correct.mp3`, `public/sounds/wrong.mp3` (placeholders — see notes)
- Modify: `src/ui/SessionScreen.tsx` (play sounds based on state.lastEvent)
- Modify: `src/App.tsx` (mute toggle in home screen, persisted in `localStorage`)

**Step 1: Source the sounds**

Find two short royalty-free sound effects:
- `correct.mp3` — soft, pleasant chime/ding (~300-500ms)
- `wrong.mp3` — neutral, NOT alarming (a soft "thud", not a buzzer)

Recommended sources: freesound.org (CC0), pixabay.com/sound-effects (royalty-free). Place in `public/sounds/`. License attribution (if any) goes in a `LICENSES.md` file at repo root.

If you can't acquire suitable sounds during this session, skip the audio implementation but keep the mute toggle wired to a no-op — that's still a Phase 2 feature.

**Step 2: Implement sounds module**

Create `src/lib/sounds.ts`:

```ts
const correctAudio = new Audio('/sounds/correct.mp3')
const wrongAudio = new Audio('/sounds/wrong.mp3')
correctAudio.volume = 0.4
wrongAudio.volume = 0.3

let muted = localStorage.getItem('nasobik-muted') === '1'

export function isMuted(): boolean { return muted }
export function setMuted(v: boolean): void {
  muted = v
  localStorage.setItem('nasobik-muted', v ? '1' : '0')
}
export function playCorrect(): void {
  if (!muted) { correctAudio.currentTime = 0; void correctAudio.play().catch(() => {}) }
}
export function playWrong(): void {
  if (!muted) { wrongAudio.currentTime = 0; void wrongAudio.play().catch(() => {}) }
}
```

**Step 3: Wire sounds into SessionScreen**

In `src/ui/SessionScreen.tsx`, when an answer is submitted (in the `submit` function or a `useEffect` reacting to `state.answers.length`), call `playCorrect()` or `playWrong()` based on the latest answer.

```ts
import { playCorrect, playWrong } from '../lib/sounds'

useEffect(() => {
  const last = state.answers[state.answers.length - 1]
  if (!last) return
  last.correct ? playCorrect() : playWrong()
}, [state.answers.length])
```

**Step 4: Add mute toggle on home**

In `src/App.tsx` home screen, add a small button:

```tsx
import { isMuted, setMuted } from './lib/sounds'

const [muted, setMutedState] = useState(isMuted())
// in home JSX:
<button
  type="button"
  onClick={() => { const v = !muted; setMuted(v); setMutedState(v) }}
  aria-label={muted ? 'Zapnout zvuk' : 'Vypnout zvuk'}
  className="text-2xl"
>
  {muted ? '🔇' : '🔊'}
</button>
```

**Step 5: Run all tests**

Run: `npm test`
Expected: green.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: sound effects with mute toggle"
```

---

## Task 10: Wire it all into App.tsx — multi-screen routing via state

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/bootstrap.ts` — add `bootstrapApp()` returning all profiles

**Step 1: Add `bootstrapApp` function**

In `src/bootstrap.ts`, add:

```ts
import { listProfiles, getCardsForProfile, getSessionsForProfile } from './db/repo'

export async function bootstrapApp(): Promise<{
  profiles: Profile[]
  cardsByProfile: Record<string, Card[]>
  sessionsByProfile: Record<string, Session[]>
}> {
  const db = await openDb()
  const profiles = await listProfiles(db)
  const cardsByProfile: Record<string, Card[]> = {}
  const sessionsByProfile: Record<string, Session[]> = {}
  for (const p of profiles) {
    cardsByProfile[p.id] = await getCardsForProfile(db, p.id)
    sessionsByProfile[p.id] = await getSessionsForProfile(db, p.id)
  }
  return { profiles, cardsByProfile, sessionsByProfile }
}
```

**Step 2: Replace `App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { bootstrapApp } from './bootstrap'
import {
  openDb, putProfile, putCards, putSession, deleteProfile,
  syncCardsToUnlockedTables, getCardsForProfile, getSessionsForProfile,
} from './db/repo'
import type { Card, Profile, Session } from './core/types'
import type { SessionState } from './core/session'
import { applyPlayedToday } from './core/streak'
import { SessionScreen } from './ui/SessionScreen'
import { SessionSummary } from './ui/SessionSummary'
import { ProfilePicker } from './ui/ProfilePicker'
import { ProfileCreate } from './ui/ProfileCreate'
import { ParentGate } from './ui/ParentGate'
import { ParentView } from './ui/ParentView'
import { ChildProgress } from './ui/ChildProgress'
import { beeScene } from './scenes/bee'
import { isMuted, setMuted } from './lib/sounds'

type Screen =
  | { type: 'loading' }
  | { type: 'picker' }
  | { type: 'create' }
  | { type: 'parent-gate' }
  | { type: 'parent' }
  | { type: 'home'; profileId: string }
  | { type: 'progress'; profileId: string }
  | { type: 'playing'; profileId: string }
  | { type: 'summary'; profileId: string; correct: number; wrong: number }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'loading' })
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [cardsByProfile, setCardsByProfile] = useState<Record<string, Card[]>>({})
  const [sessionsByProfile, setSessionsByProfile] = useState<Record<string, Session[]>>({})
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    void bootstrapApp().then(data => {
      setProfiles(data.profiles)
      setCardsByProfile(data.cardsByProfile)
      setSessionsByProfile(data.sessionsByProfile)
      setScreen({ type: 'picker' })
    })
  }, [])

  const refreshProfile = async (id: string) => {
    const db = await openDb()
    const cards = await getCardsForProfile(db, id)
    const sessions = await getSessionsForProfile(db, id)
    setCardsByProfile(prev => ({ ...prev, [id]: cards }))
    setSessionsByProfile(prev => ({ ...prev, [id]: sessions }))
  }

  const onCreateProfile = async ({ name, avatar }: { name: string; avatar: string }) => {
    const id = crypto.randomUUID()
    const profile: Profile = {
      id, name, avatar, createdAt: Date.now(),
      unlockedTables: [1, 2, 5, 10],
      selectedScene: 'bee',
      streak: { current: 0, lastPlayedDate: null, freeDayUsedThisWeek: false, lastWeekKey: null },
    }
    const db = await openDb()
    await putProfile(db, profile)
    await syncCardsToUnlockedTables(db, id, profile.unlockedTables)
    const newProfiles = [...profiles, profile]
    setProfiles(newProfiles)
    await refreshProfile(id)
    setScreen({ type: 'home', profileId: id })
  }

  const onUnlockChange = async (profileId: string, unlocked: number[]) => {
    const db = await openDb()
    const profile = profiles.find(p => p.id === profileId)!
    const updated = { ...profile, unlockedTables: unlocked }
    await putProfile(db, updated)
    await syncCardsToUnlockedTables(db, profileId, unlocked)
    setProfiles(profiles.map(p => p.id === profileId ? updated : p))
    await refreshProfile(profileId)
  }

  const onDeleteProfile = async (id: string) => {
    const db = await openDb()
    await deleteProfile(db, id)
    setProfiles(profiles.filter(p => p.id !== id))
    setCardsByProfile(prev => { const { [id]: _, ...rest } = prev; return rest })
    setSessionsByProfile(prev => { const { [id]: _, ...rest } = prev; return rest })
    setScreen({ type: 'picker' })
  }

  const onSessionFinish = async (profileId: string, state: SessionState) => {
    const db = await openDb()
    const profile = profiles.find(p => p.id === profileId)!
    const todayISO = new Date().toISOString().slice(0, 10)
    const newStreak = applyPlayedToday(profile.streak, todayISO)
    const updated = { ...profile, streak: newStreak }
    await putProfile(db, updated)
    await putCards(db, state.cards)
    const session: Session = {
      id: crypto.randomUUID(),
      profileId,
      startedAt: Date.now() - state.answers.reduce((s, a) => s + a.rt, 0),
      endedAt: Date.now(),
      answers: state.answers,
    }
    await putSession(db, session)

    setProfiles(profiles.map(p => p.id === profileId ? updated : p))
    await refreshProfile(profileId)

    const wrongCount = state.answers.filter(a => !a.correct).length
    setScreen({ type: 'summary', profileId, correct: state.correctCount, wrong: wrongCount })
  }

  const toggleMute = () => { const v = !muted; setMuted(v); setMutedState(v) }

  // === RENDER ===

  if (screen.type === 'loading') {
    return <div className="flex h-full items-center justify-center bg-amber-50 text-amber-900">Načítám…</div>
  }

  if (screen.type === 'picker') {
    return (
      <ProfilePicker
        profiles={profiles}
        onSelect={id => setScreen({ type: 'home', profileId: id })}
        onCreate={() => setScreen({ type: 'create' })}
        onOpenParent={() => setScreen({ type: 'parent-gate' })}
      />
    )
  }

  if (screen.type === 'create') {
    return <ProfileCreate onCreate={onCreateProfile} onCancel={() => setScreen({ type: 'picker' })} />
  }

  if (screen.type === 'parent-gate') {
    return (
      <ParentGate
        onUnlock={() => setScreen({ type: 'parent' })}
        onCancel={() => setScreen({ type: 'picker' })}
      />
    )
  }

  if (screen.type === 'parent') {
    return (
      <ParentView
        profiles={profiles}
        cardsByProfile={cardsByProfile}
        sessionsByProfile={sessionsByProfile}
        onUnlockChange={onUnlockChange}
        onDeleteProfile={onDeleteProfile}
        onClose={() => setScreen({ type: 'picker' })}
      />
    )
  }

  const profile = profiles.find(p => p.id === ('profileId' in screen ? screen.profileId : ''))
  if (!profile) {
    setScreen({ type: 'picker' })
    return null
  }

  if (screen.type === 'home') {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-amber-50 gap-6 p-8 relative">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Zapnout zvuk' : 'Vypnout zvuk'}
          className="absolute top-4 right-4 text-2xl"
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          onClick={() => setScreen({ type: 'picker' })}
          aria-label="Zpět na výběr profilu"
          className="absolute top-4 left-4 text-2xl"
        >
          ←
        </button>
        <div className="text-9xl">{profile.avatar}</div>
        <h1 className="text-4xl font-bold text-amber-900">Ahoj, {profile.name}!</h1>
        {profile.streak.current > 0 && (
          <p className="text-amber-700">
            {profile.streak.current} {profile.streak.current === 1 ? 'den' : 'dní'} v řadě 🔥
          </p>
        )}
        <button
          type="button"
          onClick={() => setScreen({ type: 'playing', profileId: profile.id })}
          className="rounded-2xl bg-amber-500 text-white py-4 px-8 text-2xl font-bold shadow active:scale-95"
        >
          HRÁT
        </button>
        <button
          type="button"
          onClick={() => setScreen({ type: 'progress', profileId: profile.id })}
          className="text-amber-700 underline"
        >
          Co umím
        </button>
      </div>
    )
  }

  if (screen.type === 'progress') {
    return (
      <ChildProgress
        cards={cardsByProfile[profile.id] ?? []}
        onBack={() => setScreen({ type: 'home', profileId: profile.id })}
      />
    )
  }

  if (screen.type === 'playing') {
    return (
      <SessionScreen
        cards={cardsByProfile[profile.id] ?? []}
        goalCount={beeScene.goalCount}
        scene={beeScene}
        onFinish={s => onSessionFinish(profile.id, s)}
      />
    )
  }

  if (screen.type === 'summary') {
    return (
      <SessionSummary
        correctCount={screen.correct}
        wrongCount={screen.wrong}
        onPlayAgain={() => setScreen({ type: 'playing', profileId: profile.id })}
        onDone={() => setScreen({ type: 'home', profileId: profile.id })}
      />
    )
  }

  return null
}
```

**Step 3: Verify TypeScript and tests**

Run: `npx tsc --noEmit && npm test`
Expected: all green.

**Step 4: Manual end-to-end test**

Run: `npm run dev`. Confirm:
- [ ] Picker shows profiles (might need to delete the IndexedDB in DevTools to start fresh, since old hardcoded profile may exist)
- [ ] Create new profile works
- [ ] Selecting a profile goes to home
- [ ] Streak shows after at least one finished session
- [ ] "Co umím" shows the heatmap
- [ ] Gear → math gate → parent view works
- [ ] Toggling tables in parent view affects cards (verify by checking heatmap before/after)
- [ ] Deleting a profile (with name confirmation) removes it from picker
- [ ] Multiple profiles each have their own cards
- [ ] Mute toggle persists across reload

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire phase 2 — multi-profile, parent view, streaks, child progress"
```

---

## Task 11: Phase 2 cleanup

**Step 1: Lint pass**

- Remove unused imports
- Remove any `console.log` from this phase's code
- Verify Tailwind classes are consistent

**Step 2: Run full suite**

Run: `npm run build && npm test`
Expected: clean.

**Step 3: Update README (optional)**

Document how to run dev server and tests.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: phase 2 cleanup"
```

---

## After Phase 2

- App is functionally complete for one-family use.
- Hand off to live testing — observe how dcera and kamarádky use it.
- Decide whether Phase 3 (PWA + second scene) is worth the effort, or whether Phase 2 + a one-line "add to home screen" hint is enough.

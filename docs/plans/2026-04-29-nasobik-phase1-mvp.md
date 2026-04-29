# Násobík Phase 1 MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a working multiplication-table trainer with one hardcoded profile, a kid-tuned Leitner SRS algorithm, animated emoji bee feeding session, and on-screen numpad + keyboard input — all running locally in the browser with IndexedDB persistence.

**Architecture:** Single-page React app. Pure-function SRS algorithm (`pickNext`, `applyAnswer`) with full unit-test coverage. Persistence layer wraps IndexedDB via the `idb` library, isolated behind a thin repository. Session state lives in a React reducer; UI components are dumb and receive state. Emoji-based visuals with Framer Motion for animation. No backend, no router (single screen for MVP).

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Framer Motion, idb (IndexedDB wrapper), Vitest, React Testing Library, fake-indexeddb (for tests).

**Reference:** See `docs/plans/2026-04-29-nasobik-design.md` for full design rationale and research citations.

---

## Scope of Phase 1

**In scope:**
- Vite + React + TS + Tailwind project setup
- Type definitions for Profile, Card, Session
- Card generation helper (all `a×b` for unlocked tables, 3×7 and 7×3 are separate cards)
- Leitner algorithm: `applyAnswer`, `pickNext`, with block-then-interleave for newly unlocked tables, end-on-success rule
- IndexedDB wrapper (schema v1, repository functions for profile/cards/sessions)
- Bootstrap with one hardcoded profile (`Anička`, tables `[1, 2, 5, 10]` unlocked)
- Session screen with on-screen numpad + physical keyboard input
- Emoji bee + hive UI with idle animation, fill-up animation on correct, soft shake on wrong
- "Type the correct answer" recovery flow on wrong
- End-of-session summary

**Explicitly out of scope (Phase 2/3):**
- Multiple profiles, profile selection UI
- Parent view (math gate, heatmap, table unlocking UI)
- Streaks
- Mute toggle
- "Co umím" view for child
- PWA, second scene, polished SVG

---

## Conventions

- **Test framework:** Vitest. Test files live next to the code they test as `*.test.ts(x)`. Pure-logic tests use `.test.ts`, component tests use `.test.tsx`.
- **Strict TDD** for the algorithm and reducer (Tasks 4–7). For UI tasks, write at least one render/interaction test per component.
- **Commit after every passing test or working component.** Each task in this plan ends with a commit.
- **No backwards-compatibility cruft.** First version, no migrations needed beyond IndexedDB v1.
- **Czech in user-facing strings**, English in code identifiers and commit messages.
- **Tailwind only**, no separate CSS files except `index.css` for the Tailwind directives.

---

## Task 1: Initialize Vite + React + TS project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`

**Step 1: Scaffold the project**

Run:
```bash
cd /Users/slavik/work/nasobik
npm create vite@latest . -- --template react-ts
```

When prompted to use existing directory: choose "Ignore files and continue" (the dir contains only `docs/` and `.git/`, both will be preserved).

**Step 2: Install base deps**

Run:
```bash
npm install
```

**Step 3: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: server starts on `http://localhost:5173`. Stop with Ctrl+C.

**Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: no output (success).

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project"
```

---

## Task 2: Add Tailwind, Framer Motion, idb

**Files:**
- Modify: `package.json`, `src/index.css`
- Create: `tailwind.config.js`, `postcss.config.js`

**Step 1: Install Tailwind**

Run:
```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Configure Tailwind content paths**

Edit `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**Step 3: Replace `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
}
```

**Step 4: Install runtime libs**

Run:
```bash
npm install framer-motion idb
```

**Step 5: Smoke-check Tailwind works**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="flex h-full items-center justify-center bg-amber-50">
      <h1 className="text-4xl font-bold text-amber-900">Násobík 🐝</h1>
    </div>
  )
}
```

Run `npm run dev`, open browser, confirm yellow background and centered title. Stop server.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind, Framer Motion, idb"
```

---

## Task 3: Add testing infrastructure

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `src/test/setup.ts`, `src/smoke.test.ts`

**Step 1: Install test deps**

Run:
```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb
```

**Step 2: Configure Vitest in `vite.config.ts`**

Replace contents:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Step 3: Create test setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
```

**Step 4: Add test scripts to `package.json`**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 5: Write a smoke test**

Create `src/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

**Step 6: Run tests**

Run:
```bash
npm test
```

Expected: 1 passing test.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: add Vitest + RTL + fake-indexeddb"
```

---

## Task 4: Define core types and card-generation helper

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/cards.ts`
- Create: `src/core/cards.test.ts`

**Step 1: Write the failing test**

Create `src/core/cards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateCardsForTables } from './cards'

describe('generateCardsForTables', () => {
  it('generates 100 cards for tables 1-10', () => {
    const cards = generateCardsForTables('p1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(cards).toHaveLength(100)
  })

  it('treats 3x7 and 7x3 as separate cards', () => {
    const cards = generateCardsForTables('p1', [3, 7])
    const ids = cards.map(c => c.id)
    expect(ids).toContain('p1:3x7')
    expect(ids).toContain('p1:7x3')
  })

  it('initializes every card in box 1', () => {
    const cards = generateCardsForTables('p1', [2])
    expect(cards.every(c => c.box === 1)).toBe(true)
  })

  it('only generates cards where the first factor is in unlocked tables', () => {
    const cards = generateCardsForTables('p1', [2])
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.a === 2)).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- cards`
Expected: FAIL — module not found.

**Step 3: Write the types**

Create `src/core/types.ts`:

```ts
export type Profile = {
  id: string
  name: string
  avatar: string
  createdAt: number
  unlockedTables: number[]
  selectedScene: string
}

export type Card = {
  id: string
  profileId: string
  a: number
  b: number
  box: 1 | 2 | 3 | 4 | 5
  exposuresSinceLastSeen: number
  sessionsSinceLastSeen: number
  lastRT: number | null
  totalSeen: number
  totalCorrect: number
}

export type AnswerEvent = {
  a: number
  b: number
  correct: boolean
  rt: number
}

export type Session = {
  id: string
  profileId: string
  startedAt: number
  endedAt: number | null
  answers: AnswerEvent[]
}
```

**Step 4: Implement `generateCardsForTables`**

Create `src/core/cards.ts`:

```ts
import type { Card } from './types'

export function generateCardsForTables(profileId: string, tables: number[]): Card[] {
  const cards: Card[] = []
  for (const a of tables) {
    for (let b = 1; b <= 10; b++) {
      cards.push({
        id: `${profileId}:${a}x${b}`,
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
  return cards
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- cards`
Expected: 4 passing.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: core types and card generation"
```

---

## Task 5: Leitner — `applyAnswer`

**Files:**
- Create: `src/core/leitner.ts`
- Create: `src/core/leitner.test.ts`

**Step 1: Write the failing tests**

Create `src/core/leitner.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyAnswer } from './leitner'
import type { Card } from './types'

const baseCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'p1:3x7',
  profileId: 'p1',
  a: 3,
  b: 7,
  box: 1,
  exposuresSinceLastSeen: 5,
  sessionsSinceLastSeen: 0,
  lastRT: null,
  totalSeen: 0,
  totalCorrect: 0,
  ...overrides,
})

describe('applyAnswer', () => {
  it('correct answer promotes box by 1', () => {
    const updated = applyAnswer(baseCard({ box: 2 }), { correct: true, rt: 2000 })
    expect(updated.box).toBe(3)
  })

  it('correct answer at box 5 stays at 5', () => {
    const updated = applyAnswer(baseCard({ box: 5 }), { correct: true, rt: 1500 })
    expect(updated.box).toBe(5)
  })

  it('wrong answer drops to box 1 regardless of previous box', () => {
    const updated = applyAnswer(baseCard({ box: 4 }), { correct: false, rt: 5000 })
    expect(updated.box).toBe(1)
  })

  it('resets exposuresSinceLastSeen to 0', () => {
    const updated = applyAnswer(baseCard({ exposuresSinceLastSeen: 5 }), { correct: true, rt: 2000 })
    expect(updated.exposuresSinceLastSeen).toBe(0)
  })

  it('resets sessionsSinceLastSeen to 0', () => {
    const updated = applyAnswer(baseCard({ sessionsSinceLastSeen: 3 }), { correct: true, rt: 2000 })
    expect(updated.sessionsSinceLastSeen).toBe(0)
  })

  it('records last RT', () => {
    const updated = applyAnswer(baseCard(), { correct: true, rt: 1234 })
    expect(updated.lastRT).toBe(1234)
  })

  it('increments totalSeen and totalCorrect on correct answer', () => {
    const updated = applyAnswer(baseCard({ totalSeen: 10, totalCorrect: 7 }), { correct: true, rt: 2000 })
    expect(updated.totalSeen).toBe(11)
    expect(updated.totalCorrect).toBe(8)
  })

  it('increments totalSeen but not totalCorrect on wrong answer', () => {
    const updated = applyAnswer(baseCard({ totalSeen: 10, totalCorrect: 7 }), { correct: false, rt: 2000 })
    expect(updated.totalSeen).toBe(11)
    expect(updated.totalCorrect).toBe(7)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- leitner`
Expected: FAIL — module not found.

**Step 3: Implement `applyAnswer`**

Create `src/core/leitner.ts`:

```ts
import type { Card } from './types'

export function applyAnswer(
  card: Card,
  outcome: { correct: boolean; rt: number },
): Card {
  const newBox = outcome.correct
    ? (Math.min(card.box + 1, 5) as Card['box'])
    : 1

  return {
    ...card,
    box: newBox,
    exposuresSinceLastSeen: 0,
    sessionsSinceLastSeen: 0,
    lastRT: outcome.rt,
    totalSeen: card.totalSeen + 1,
    totalCorrect: card.totalCorrect + (outcome.correct ? 1 : 0),
  }
}
```

**Step 4: Run tests**

Run: `npm test -- leitner`
Expected: 8 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: leitner applyAnswer"
```

---

## Task 6: Leitner — `bumpExposure` (called for non-picked cards)

**Files:**
- Modify: `src/core/leitner.ts`, `src/core/leitner.test.ts`

**Background:** Every time we present *any* card during a session, the other not-presented cards' `exposuresSinceLastSeen` counter increments by 1 (so we know how long each card has been "waiting"). This drives the within-session interval.

**Step 1: Add failing test**

Append to `src/core/leitner.test.ts`:

```ts
describe('bumpExposure', () => {
  it('increments exposuresSinceLastSeen', () => {
    const updated = bumpExposure(baseCard({ exposuresSinceLastSeen: 4 }))
    expect(updated.exposuresSinceLastSeen).toBe(5)
  })

  it('does not change box or other fields', () => {
    const card = baseCard({ box: 3, totalSeen: 10 })
    const updated = bumpExposure(card)
    expect(updated.box).toBe(3)
    expect(updated.totalSeen).toBe(10)
  })
})
```

Add import: `import { applyAnswer, bumpExposure } from './leitner'`

**Step 2: Run test to verify it fails**

Run: `npm test -- leitner`
Expected: FAIL — `bumpExposure` not exported.

**Step 3: Implement**

Append to `src/core/leitner.ts`:

```ts
export function bumpExposure(card: Card): Card {
  return { ...card, exposuresSinceLastSeen: card.exposuresSinceLastSeen + 1 }
}
```

**Step 4: Run tests**

Run: `npm test -- leitner`
Expected: 10 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: leitner bumpExposure"
```

---

## Task 7: Leitner — `pickNext` priority logic

**Files:**
- Modify: `src/core/leitner.ts`, `src/core/leitner.test.ts`

**Background:** `pickNext` chooses the next card to show. Rules:

1. Cards in lower boxes have priority.
2. Within Box 1: card needs `exposuresSinceLastSeen >= 3` to be ready. If no Box 1 card is "ready," try Box 2.
3. Box 2 needs `exposuresSinceLastSeen >= 10`.
4. Boxes 3, 4, 5 are due based on `sessionsSinceLastSeen` (3 = 1+, 4 = 2+, 5 = 3+).
5. Among ready cards, pick the one with the highest `exposuresSinceLastSeen` (most overdue). Ties broken by card id (deterministic for tests).
6. **Block-then-interleave:** if the session's `blockingTable` is set (newly unlocked table, first 15 questions), only pick cards where `card.a === blockingTable`.
7. If absolutely nothing is "ready" (rare), fall back to whichever card has the highest priority by raw box.

**Step 1: Write failing tests**

Append to `src/core/leitner.test.ts`:

```ts
import { pickNext } from './leitner'

describe('pickNext', () => {
  it('returns null if no cards', () => {
    expect(pickNext([], { blockingTable: null })).toBeNull()
  })

  it('prefers a ready Box 1 card over a ready Box 2 card', () => {
    const cards = [
      baseCard({ id: 'a', box: 2, exposuresSinceLastSeen: 15 }),
      baseCard({ id: 'b', box: 1, exposuresSinceLastSeen: 5 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('b')
  })

  it('skips a Box 1 card that has not waited 3 exposures yet', () => {
    const cards = [
      baseCard({ id: 'a', box: 1, exposuresSinceLastSeen: 1 }),
      baseCard({ id: 'b', box: 2, exposuresSinceLastSeen: 12 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('b')
  })

  it('within a box, prefers the card with the highest exposuresSinceLastSeen', () => {
    const cards = [
      baseCard({ id: 'a', box: 1, exposuresSinceLastSeen: 4 }),
      baseCard({ id: 'b', box: 1, exposuresSinceLastSeen: 7 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('b')
  })

  it('respects blockingTable: only picks cards where card.a matches', () => {
    const cards = [
      baseCard({ id: 'a', a: 5, b: 3, box: 1, exposuresSinceLastSeen: 10 }),
      baseCard({ id: 'b', a: 7, b: 4, box: 1, exposuresSinceLastSeen: 10 }),
    ]
    expect(pickNext(cards, { blockingTable: 7 })?.id).toBe('b')
  })

  it('returns Box 3 cards in a fresh session (sessionsSinceLastSeen >= 1)', () => {
    const cards = [
      baseCard({ id: 'a', box: 3, sessionsSinceLastSeen: 1, exposuresSinceLastSeen: 0 }),
    ]
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('a')
  })

  it('skips Box 4 cards that have not waited enough sessions', () => {
    const cards = [
      baseCard({ id: 'a', box: 4, sessionsSinceLastSeen: 1, exposuresSinceLastSeen: 0 }),
    ]
    expect(pickNext(cards, { blockingTable: null })).toBeNull()
  })

  it('falls back to the lowest-box card if nothing is "ready" (e.g., start of session)', () => {
    const cards = [
      baseCard({ id: 'a', box: 5, exposuresSinceLastSeen: 0 }),
      baseCard({ id: 'b', box: 3, exposuresSinceLastSeen: 0, sessionsSinceLastSeen: 0 }),
      baseCard({ id: 'c', box: 1, exposuresSinceLastSeen: 0 }),
    ]
    // c is the lowest box; everything is "not ready" but we still must pick
    expect(pickNext(cards, { blockingTable: null })?.id).toBe('c')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- leitner`
Expected: FAIL — `pickNext` not exported.

**Step 3: Implement `pickNext`**

Append to `src/core/leitner.ts`:

```ts
type PickContext = { blockingTable: number | null }

const BOX_EXPOSURE_THRESHOLD: Record<Card['box'], number> = {
  1: 3,
  2: 10,
  3: 0,
  4: 0,
  5: 0,
}

const BOX_SESSION_THRESHOLD: Record<Card['box'], number> = {
  1: 0,
  2: 0,
  3: 1,
  4: 2,
  5: 3,
}

function isReady(card: Card): boolean {
  return (
    card.exposuresSinceLastSeen >= BOX_EXPOSURE_THRESHOLD[card.box] &&
    card.sessionsSinceLastSeen >= BOX_SESSION_THRESHOLD[card.box]
  )
}

export function pickNext(cards: Card[], ctx: PickContext): Card | null {
  if (cards.length === 0) return null

  const eligible = ctx.blockingTable !== null
    ? cards.filter(c => c.a === ctx.blockingTable)
    : cards

  if (eligible.length === 0) return null

  const ready = eligible.filter(isReady)
  const pool = ready.length > 0 ? ready : eligible

  // Sort: lower box first, then higher exposuresSinceLastSeen, then id (stable tie-break)
  const sorted = [...pool].sort((a, b) => {
    if (a.box !== b.box) return a.box - b.box
    if (a.exposuresSinceLastSeen !== b.exposuresSinceLastSeen) {
      return b.exposuresSinceLastSeen - a.exposuresSinceLastSeen
    }
    return a.id.localeCompare(b.id)
  })

  return sorted[0]
}
```

Add `export type { PickContext }` if needed elsewhere (skip for now).

**Step 4: Run tests**

Run: `npm test -- leitner`
Expected: 18 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: leitner pickNext with block-then-interleave"
```

---

## Task 8: Session reducer — state machine

**Files:**
- Create: `src/core/session.ts`
- Create: `src/core/session.test.ts`

**Background:** The session is a state machine with 4 phases:

- `'idle'` — before start
- `'asking'` — question shown, waiting for answer
- `'showing-correction'` — wrong answer; user must type the correct answer to proceed
- `'finished'` — goal reached

State carries: `cards` (the working set), `currentCard`, `correctCount`, `goalCount`, `pendingFinale` (the last card to show, picked from box 4-5 to "end on success"), `blockingTable`, `answers` (history for the session).

Actions:
- `START` — initialize session from cards, decide blockingTable, pick first card
- `SUBMIT_ANSWER { value: number, rt: number }` — check if correct, branch
- `CONFIRM_CORRECTION { value: number }` — only valid in `showing-correction`; if value matches, advance
- `END` — explicit close

For Phase 1: `goalCount = 20`, hard cap at 35 questions answered (correct + wrong combined).

**Detail on the "end on success" rule:** When `correctCount` is about to reach `goalCount - 1`, the next card we pick should be from Box 4 or 5 (a known item) if any exist. If none exist (very early in the profile's life), use the normal pick logic.

**Step 1: Write failing tests**

Create `src/core/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sessionReducer, initSessionState, type SessionAction } from './session'
import { generateCardsForTables } from './cards'

const cards = (n = 100) => generateCardsForTables('p1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

describe('sessionReducer', () => {
  it('starts in idle', () => {
    const s = initSessionState()
    expect(s.phase).toBe('idle')
    expect(s.correctCount).toBe(0)
  })

  it('transitions to asking on START and picks a current card', () => {
    const s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    expect(s.phase).toBe('asking')
    expect(s.currentCard).not.toBeNull()
  })

  it('correct answer increments correctCount and picks a new card', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    const first = s.currentCard!
    const correct = first.a * first.b
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: correct, rt: 1500 })
    expect(s.phase).toBe('asking')
    expect(s.correctCount).toBe(1)
    expect(s.currentCard?.id).not.toBe(first.id)
  })

  it('wrong answer transitions to showing-correction with the original card', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    const first = s.currentCard!
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    expect(s.phase).toBe('showing-correction')
    expect(s.currentCard?.id).toBe(first.id)
    expect(s.correctCount).toBe(0)
  })

  it('CONFIRM_CORRECTION with matching value advances to next card', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    const first = s.currentCard!
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: first.a * first.b })
    expect(s.phase).toBe('asking')
    expect(s.currentCard?.id).not.toBe(first.id)
  })

  it('CONFIRM_CORRECTION with wrong value stays in showing-correction', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 20,
      blockingTable: null,
    })
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: 99998 })
    expect(s.phase).toBe('showing-correction')
  })

  it('reaches finished when correctCount === goalCount', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 3,
      blockingTable: null,
    })
    while (s.phase === 'asking' && s.currentCard) {
      const c = s.currentCard
      s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: c.a * c.b, rt: 1500 })
    }
    expect(s.phase).toBe('finished')
    expect(s.correctCount).toBe(3)
  })

  it('records every answer in state.answers', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 2,
      blockingTable: null,
    })
    const first = s.currentCard!
    s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
    s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: first.a * first.b })
    expect(s.answers).toHaveLength(1)
    expect(s.answers[0].correct).toBe(false)
  })

  it('hard caps total submitted answers at 35 even if goal not met', () => {
    let s = sessionReducer(initSessionState(), {
      type: 'START',
      cards: cards(),
      goalCount: 100, // unreachably high
      blockingTable: null,
    })
    let safety = 0
    while (s.phase !== 'finished' && safety < 200) {
      if (s.phase === 'asking') {
        s = sessionReducer(s, { type: 'SUBMIT_ANSWER', value: 99999, rt: 3000 })
      } else if (s.phase === 'showing-correction') {
        const c = s.currentCard!
        s = sessionReducer(s, { type: 'CONFIRM_CORRECTION', value: c.a * c.b })
      }
      safety++
    }
    expect(s.phase).toBe('finished')
    expect(s.answers.length).toBeLessThanOrEqual(35)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- session`
Expected: FAIL — module not found.

**Step 3: Implement the reducer**

Create `src/core/session.ts`:

```ts
import type { Card, AnswerEvent } from './types'
import { applyAnswer, bumpExposure, pickNext } from './leitner'

export type SessionPhase = 'idle' | 'asking' | 'showing-correction' | 'finished'

export type SessionState = {
  phase: SessionPhase
  cards: Card[]
  currentCard: Card | null
  correctCount: number
  goalCount: number
  blockingTable: number | null
  answers: AnswerEvent[]
  hardCap: number
}

export type SessionAction =
  | { type: 'START'; cards: Card[]; goalCount: number; blockingTable: number | null }
  | { type: 'SUBMIT_ANSWER'; value: number; rt: number }
  | { type: 'CONFIRM_CORRECTION'; value: number }
  | { type: 'END' }

export function initSessionState(): SessionState {
  return {
    phase: 'idle',
    cards: [],
    currentCard: null,
    correctCount: 0,
    goalCount: 0,
    blockingTable: null,
    answers: [],
    hardCap: 35,
  }
}

function bumpAllExcept(cards: Card[], excludedId: string): Card[] {
  return cards.map(c => (c.id === excludedId ? c : bumpExposure(c)))
}

function replaceCard(cards: Card[], updated: Card): Card[] {
  return cards.map(c => (c.id === updated.id ? updated : c))
}

function pickNextWithFinale(state: SessionState): Card | null {
  const remainingForGoal = state.goalCount - state.correctCount
  // If we're about to ask the last question to reach the goal, prefer a Box 4-5 card.
  if (remainingForGoal === 1) {
    const finale = pickNext(
      state.cards.filter(c => c.box >= 4),
      { blockingTable: state.blockingTable },
    )
    if (finale) return finale
  }
  return pickNext(state.cards, { blockingTable: state.blockingTable })
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START': {
      const next: SessionState = {
        ...initSessionState(),
        phase: 'asking',
        cards: action.cards,
        goalCount: action.goalCount,
        blockingTable: action.blockingTable,
      }
      const first = pickNext(action.cards, { blockingTable: action.blockingTable })
      return { ...next, currentCard: first }
    }

    case 'SUBMIT_ANSWER': {
      if (state.phase !== 'asking' || !state.currentCard) return state
      const card = state.currentCard
      const expected = card.a * card.b
      const correct = action.value === expected
      const event: AnswerEvent = { a: card.a, b: card.b, correct, rt: action.rt }

      if (!correct) {
        return {
          ...state,
          phase: 'showing-correction',
          answers: [...state.answers, event],
        }
      }

      // Correct: update card, bump others, advance.
      const updated = applyAnswer(card, { correct: true, rt: action.rt })
      const bumped = bumpAllExcept(state.cards, card.id)
      const newCards = replaceCard(bumped, updated)
      const correctCount = state.correctCount + 1
      const answers = [...state.answers, event]

      const reachedGoal = correctCount >= state.goalCount
      const reachedCap = answers.length >= state.hardCap

      if (reachedGoal || reachedCap) {
        return { ...state, cards: newCards, currentCard: null, correctCount, answers, phase: 'finished' }
      }

      const nextStateForPick: SessionState = { ...state, cards: newCards, correctCount }
      const nextCard = pickNextWithFinale(nextStateForPick)
      return {
        ...state,
        cards: newCards,
        currentCard: nextCard,
        correctCount,
        answers,
        phase: nextCard ? 'asking' : 'finished',
      }
    }

    case 'CONFIRM_CORRECTION': {
      if (state.phase !== 'showing-correction' || !state.currentCard) return state
      const card = state.currentCard
      const expected = card.a * card.b
      if (action.value !== expected) return state // user must type correct value

      // Apply the wrong-answer effect now, then advance.
      const updated = applyAnswer(card, { correct: false, rt: 0 })
      const bumped = bumpAllExcept(state.cards, card.id)
      const newCards = replaceCard(bumped, updated)
      const reachedCap = state.answers.length >= state.hardCap

      if (reachedCap) {
        return { ...state, cards: newCards, currentCard: null, phase: 'finished' }
      }

      const nextStateForPick: SessionState = { ...state, cards: newCards }
      const nextCard = pickNextWithFinale(nextStateForPick)
      return {
        ...state,
        cards: newCards,
        currentCard: nextCard,
        phase: nextCard ? 'asking' : 'finished',
      }
    }

    case 'END':
      return { ...state, phase: 'finished', currentCard: null }
  }
}
```

**Step 4: Run tests**

Run: `npm test -- session`
Expected: 9 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: session reducer state machine"
```

---

## Task 9: IndexedDB repository

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/repo.ts`
- Create: `src/db/repo.test.ts`

**Step 1: Write failing tests**

Create `src/db/repo.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { openDb, putProfile, getProfile, putCards, getCardsForProfile, putSession } from './repo'
import { generateCardsForTables } from '../core/cards'

beforeEach(async () => {
  // fake-indexeddb resets via setup; force a fresh DB by deleting if exists
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
  })

  it('round-trips cards for a profile', async () => {
    const db = await openDb()
    const cards = generateCardsForTables('p1', [2])
    await putCards(db, cards)
    const got = await getCardsForProfile(db, 'p1')
    expect(got).toHaveLength(10)
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
    // No fetch yet (heatmap is Phase 2). Just confirm no throw.
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- repo`
Expected: FAIL — module not found.

**Step 3: Implement schema**

Create `src/db/schema.ts`:

```ts
import type { DBSchema } from 'idb'
import type { Profile, Card, Session } from '../core/types'

export interface NasobikDB extends DBSchema {
  profiles: { key: string; value: Profile }
  cards: { key: string; value: Card; indexes: { 'by-profile': string } }
  sessions: { key: string; value: Session; indexes: { 'by-profile': string } }
}

export const DB_NAME = 'nasobik'
export const DB_VERSION = 1
```

**Step 4: Implement repo**

Create `src/db/repo.ts`:

```ts
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
```

**Step 5: Run tests**

Run: `npm test -- repo`
Expected: 3 passing.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: IndexedDB repository for profiles, cards, sessions"
```

---

## Task 10: Bootstrap — load or create the hardcoded profile

**Files:**
- Create: `src/bootstrap.ts`
- Create: `src/bootstrap.test.ts`

**Behavior:** On app load, ensure a profile named `Anička` exists with `unlockedTables = [1, 2, 5, 10]`. If it doesn't, create it and seed cards. Returns `{ profile, cards }`.

**Step 1: Write failing test**

Create `src/bootstrap.test.ts`:

```ts
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
    expect(result.cards).toHaveLength(40) // 4 tables × 10
  })

  it('is idempotent across runs', async () => {
    await bootstrapDefaultProfile()
    const second = await bootstrapDefaultProfile()
    expect(second.profile.name).toBe('Anička')
    expect(second.cards).toHaveLength(40)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- bootstrap`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/bootstrap.ts`:

```ts
import { openDb, getProfile, putProfile, getCardsForProfile, putCards } from './db/repo'
import { generateCardsForTables } from './core/cards'
import type { Profile, Card } from './core/types'

const DEFAULT_ID = 'anicka'

export async function bootstrapDefaultProfile(): Promise<{ profile: Profile; cards: Card[] }> {
  const db = await openDb()
  let profile = await getProfile(db, DEFAULT_ID)
  if (!profile) {
    profile = {
      id: DEFAULT_ID,
      name: 'Anička',
      avatar: '🐝',
      createdAt: Date.now(),
      unlockedTables: [1, 2, 5, 10],
      selectedScene: 'bee',
    }
    await putProfile(db, profile)
  }

  let cards = await getCardsForProfile(db, profile.id)
  if (cards.length === 0) {
    cards = generateCardsForTables(profile.id, profile.unlockedTables)
    await putCards(db, cards)
  }

  return { profile, cards }
}
```

**Step 4: Run tests**

Run: `npm test -- bootstrap`
Expected: 2 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: bootstrap hardcoded default profile"
```

---

## Task 11: Numpad component

**Files:**
- Create: `src/ui/Numpad.tsx`
- Create: `src/ui/Numpad.test.tsx`

**Step 1: Write failing test**

Create `src/ui/Numpad.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Numpad } from './Numpad'

describe('Numpad', () => {
  it('calls onDigit when a digit is clicked', async () => {
    const onDigit = vi.fn()
    render(<Numpad onDigit={onDigit} onClear={() => {}} onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '7' }))
    expect(onDigit).toHaveBeenCalledWith(7)
  })

  it('calls onClear when clear is clicked', async () => {
    const onClear = vi.fn()
    render(<Numpad onDigit={() => {}} onClear={onClear} onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /smazat/i }))
    expect(onClear).toHaveBeenCalled()
  })

  it('calls onSubmit when enter is clicked', async () => {
    const onSubmit = vi.fn()
    render(<Numpad onDigit={() => {}} onClear={() => {}} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(onSubmit).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- Numpad`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/ui/Numpad.tsx`:

```tsx
type Props = {
  onDigit: (d: number) => void
  onClear: () => void
  onSubmit: () => void
}

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Numpad({ onDigit, onClear, onSubmit }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm w-full mx-auto">
      {KEYS.map(k => (
        <button
          key={k}
          type="button"
          onClick={() => onDigit(k)}
          className="rounded-2xl bg-white shadow-md py-6 text-3xl font-bold text-amber-900 active:scale-95 transition"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="rounded-2xl bg-amber-100 shadow-md py-6 text-xl font-semibold text-amber-900 active:scale-95 transition"
        aria-label="Smazat"
      >
        ⌫
      </button>
      <button
        type="button"
        onClick={() => onDigit(0)}
        className="rounded-2xl bg-white shadow-md py-6 text-3xl font-bold text-amber-900 active:scale-95 transition"
      >
        0
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className="rounded-2xl bg-amber-500 shadow-md py-6 text-xl font-bold text-white active:scale-95 transition"
        aria-label="Hotovo"
      >
        ✓
      </button>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- Numpad`
Expected: 3 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: Numpad component"
```

---

## Task 12: Bee scene components (emoji-based)

**Files:**
- Create: `src/scenes/types.ts`
- Create: `src/scenes/bee/index.tsx`
- Create: `src/scenes/bee/Bee.tsx`
- Create: `src/scenes/bee/Hive.tsx`

**Step 1: Define scene types**

Create `src/scenes/types.ts`:

```tsx
import type { ComponentType } from 'react'

export type SceneCtx = {
  correctCount: number
  wrongCount: number
  goalCount: number
  lastEvent: 'correct' | 'wrong' | 'idle'
}

export type Scene = {
  id: string
  name: string
  thumbnail: string
  goalCount: number
  Hero: ComponentType<SceneCtx>
  Container: ComponentType<SceneCtx>
}
```

**Step 2: Create Bee component**

Create `src/scenes/bee/Bee.tsx`:

```tsx
import { motion } from 'framer-motion'
import type { SceneCtx } from '../types'

export function Bee({ lastEvent }: SceneCtx) {
  return (
    <motion.div
      animate={
        lastEvent === 'correct'
          ? { y: [0, -20, 0], rotate: [0, 10, -10, 0] }
          : lastEvent === 'wrong'
          ? { x: [0, -8, 8, -8, 0] }
          : { y: [0, -6, 0] }
      }
      transition={
        lastEvent === 'idle'
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.6 }
      }
      className="text-7xl select-none"
    >
      🐝
    </motion.div>
  )
}
```

**Step 3: Create Hive component**

Create `src/scenes/bee/Hive.tsx`:

```tsx
import type { SceneCtx } from '../types'

export function Hive({ correctCount, goalCount }: SceneCtx) {
  const ratio = goalCount === 0 ? 0 : Math.min(correctCount / goalCount, 1)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-5xl">🍯</div>
      <div className="w-32 h-3 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="text-sm text-amber-900 font-semibold">
        {correctCount} / {goalCount}
      </div>
    </div>
  )
}
```

**Step 4: Wire up scene index**

Create `src/scenes/bee/index.tsx`:

```tsx
import type { Scene } from '../types'
import { Bee } from './Bee'
import { Hive } from './Hive'

export const beeScene: Scene = {
  id: 'bee',
  name: 'Včelka',
  thumbnail: '🐝',
  goalCount: 20,
  Hero: Bee,
  Container: Hive,
}
```

**Step 5: Smoke-render in browser**

(Not committed — temporary check.) Edit `src/App.tsx` to render the Bee + Hive at fixed `correctCount=5`, `goalCount=20`. Run `npm run dev`, verify it shows the bee + hive + progress bar at 25%. Revert App.tsx after.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: bee scene with emoji-based Bee and Hive"
```

---

## Task 13: SessionScreen — wire it all together

**Files:**
- Create: `src/ui/SessionScreen.tsx`
- Create: `src/ui/SessionScreen.test.tsx`

**Behavior:** Receives `cards` and `goalCount` via props. Drives the `sessionReducer`. Renders Bee + Hive + question + answer field + Numpad + "Já nevím" button. Handles correct/wrong UX (correction step). Calls `onFinish(state)` when phase becomes `finished`.

**Step 1: Write failing test**

Create `src/ui/SessionScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionScreen } from './SessionScreen'
import { generateCardsForTables } from '../core/cards'
import { beeScene } from '../scenes/bee'

describe('SessionScreen', () => {
  it('shows the first question on mount', () => {
    const cards = generateCardsForTables('p1', [2])
    render(
      <SessionScreen
        cards={cards}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    // Some 2×N question is on screen
    expect(screen.getByText(/×/)).toBeInTheDocument()
  })

  it('typing the correct answer via numpad advances the hive', async () => {
    const cards = generateCardsForTables('p1', [2])
    render(
      <SessionScreen
        cards={cards}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    // Read the question and figure out the answer
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*×\s*(\d+)/)!
    const a = Number(match[1])
    const b = Number(match[2])
    const product = a * b
    for (const ch of String(product)) {
      await userEvent.click(screen.getByRole('button', { name: ch }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('calls onFinish when goal reached', async () => {
    const onFinish = vi.fn()
    const cards = generateCardsForTables('p1', [2])
    render(
      <SessionScreen
        cards={cards}
        goalCount={1}
        scene={beeScene}
        onFinish={onFinish}
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*×\s*(\d+)/)!
    const product = Number(match[1]) * Number(match[2])
    for (const ch of String(product)) {
      await userEvent.click(screen.getByRole('button', { name: ch }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(onFinish).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SessionScreen`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/ui/SessionScreen.tsx`:

```tsx
import { useEffect, useReducer, useRef, useState } from 'react'
import { sessionReducer, initSessionState } from '../core/session'
import type { SessionState } from '../core/session'
import type { Card } from '../core/types'
import type { Scene } from '../scenes/types'
import { Numpad } from './Numpad'

type Props = {
  cards: Card[]
  goalCount: number
  scene: Scene
  onFinish: (state: SessionState) => void
}

export function SessionScreen({ cards, goalCount, scene, onFinish }: Props) {
  const [state, dispatch] = useReducer(sessionReducer, initSessionState())
  const [input, setInput] = useState('')
  const askedAtRef = useRef<number>(Date.now())

  // Start the session once
  useEffect(() => {
    dispatch({ type: 'START', cards, goalCount, blockingTable: null })
  }, [cards, goalCount])

  // Reset askedAt when a new card is shown
  useEffect(() => {
    if (state.phase === 'asking') {
      askedAtRef.current = Date.now()
      setInput('')
    }
  }, [state.currentCard?.id, state.phase])

  // Notify parent when finished
  useEffect(() => {
    if (state.phase === 'finished') onFinish(state)
  }, [state.phase, state, onFinish])

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        setInput(prev => (prev.length < 4 ? prev + e.key : prev))
      } else if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1))
      } else if (e.key === 'Enter') {
        submit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state.phase])

  const submit = () => {
    if (input === '') return
    const value = Number(input)
    if (state.phase === 'asking') {
      const rt = Date.now() - askedAtRef.current
      dispatch({ type: 'SUBMIT_ANSWER', value, rt })
    } else if (state.phase === 'showing-correction') {
      dispatch({ type: 'CONFIRM_CORRECTION', value })
    }
    setInput('')
  }

  const card = state.currentCard
  const sceneCtx = {
    correctCount: state.correctCount,
    wrongCount: state.answers.filter(a => !a.correct).length,
    goalCount: state.goalCount,
    lastEvent: lastEventOf(state),
  }
  const Hero = scene.Hero
  const Container = scene.Container

  if (state.phase === 'idle' || !card) {
    return <div className="p-8 text-center text-amber-900">Načítám…</div>
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 p-4 gap-4">
      <header className="flex items-center justify-between">
        <Container {...sceneCtx} />
        <Hero {...sceneCtx} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-6">
        <h1 className="text-6xl font-bold text-amber-900 tabular-nums">
          {card.a} × {card.b} = ?
        </h1>

        <div className="text-5xl font-mono bg-white rounded-2xl px-8 py-4 shadow min-w-[6rem] text-center text-amber-900 tabular-nums min-h-[5rem]">
          {input || ' '}
        </div>

        {state.phase === 'showing-correction' && (
          <div className="text-2xl text-amber-700 font-semibold text-center">
            <div>Správně je {card.a * card.b}.</div>
            <div className="text-base text-amber-600 mt-1">Napiš to číslo.</div>
          </div>
        )}
      </main>

      <footer className="flex flex-col gap-3 items-center">
        <Numpad
          onDigit={d => setInput(prev => (prev.length < 4 ? prev + String(d) : prev))}
          onClear={() => setInput(prev => prev.slice(0, -1))}
          onSubmit={submit}
        />
        {state.phase === 'asking' && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SUBMIT_ANSWER', value: -1, rt: 0 })}
            className="text-amber-700 underline text-sm"
          >
            Já nevím
          </button>
        )}
      </footer>
    </div>
  )
}

function lastEventOf(state: SessionState): 'correct' | 'wrong' | 'idle' {
  if (state.answers.length === 0) return 'idle'
  return state.answers[state.answers.length - 1].correct ? 'correct' : 'wrong'
}
```

**Step 4: Run tests**

Run: `npm test -- SessionScreen`
Expected: 3 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: SessionScreen wires reducer, Numpad, scene, keyboard input"
```

---

## Task 14: End-of-session summary screen

**Files:**
- Create: `src/ui/SessionSummary.tsx`
- Create: `src/ui/SessionSummary.test.tsx`

**Step 1: Write failing test**

Create `src/ui/SessionSummary.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionSummary } from './SessionSummary'

describe('SessionSummary', () => {
  it('shows correct and wrong counts', () => {
    render(
      <SessionSummary
        correctCount={18}
        wrongCount={2}
        onPlayAgain={() => {}}
        onDone={() => {}}
      />,
    )
    expect(screen.getByText(/18/)).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('calls onPlayAgain', async () => {
    const onPlayAgain = vi.fn()
    render(
      <SessionSummary
        correctCount={20}
        wrongCount={0}
        onPlayAgain={onPlayAgain}
        onDone={() => {}}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /hrát znovu/i }))
    expect(onPlayAgain).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SessionSummary`
Expected: FAIL — module not found.

**Step 3: Implement**

Create `src/ui/SessionSummary.tsx`:

```tsx
type Props = {
  correctCount: number
  wrongCount: number
  onPlayAgain: () => void
  onDone: () => void
}

export function SessionSummary({ correctCount, wrongCount, onPlayAgain, onDone }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-amber-50 p-8 gap-6">
      <div className="text-8xl">🐝</div>
      <h1 className="text-4xl font-bold text-amber-900 text-center">
        Nakrmila jsi včelku!
      </h1>
      <div className="text-xl text-amber-800 text-center space-y-1">
        <div>{correctCount} × správně 🍯</div>
        {wrongCount > 0 && <div>{wrongCount} × se ještě poučíme 🌱</div>}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-2xl bg-amber-500 text-white py-4 px-6 text-xl font-bold shadow active:scale-95"
        >
          Hrát znovu
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-white text-amber-900 py-4 px-6 text-xl font-bold shadow active:scale-95"
        >
          Hotovo
        </button>
      </div>
    </div>
  )
}
```

**Step 4: Run tests**

Run: `npm test -- SessionSummary`
Expected: 2 passing.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: SessionSummary screen"
```

---

## Task 15: Wire App.tsx — bootstrap, persist, render

**Files:**
- Modify: `src/App.tsx`

**Behavior:** On mount, bootstrap the default profile. Render either SessionScreen, SessionSummary, or a simple Home screen. After session finishes, persist updated cards + session record.

**Step 1: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { bootstrapDefaultProfile } from './bootstrap'
import { openDb, putCards, putSession } from './db/repo'
import type { Card, Profile } from './core/types'
import type { SessionState } from './core/session'
import { SessionScreen } from './ui/SessionScreen'
import { SessionSummary } from './ui/SessionSummary'
import { beeScene } from './scenes/bee'

type Phase = 'loading' | 'home' | 'playing' | 'summary'

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [lastSummary, setLastSummary] = useState<{ correct: number; wrong: number } | null>(null)

  useEffect(() => {
    void bootstrapDefaultProfile().then(({ profile, cards }) => {
      setProfile(profile)
      setCards(cards)
      setPhase('home')
    })
  }, [])

  const onFinish = async (state: SessionState) => {
    if (!profile) return
    const wrongCount = state.answers.filter(a => !a.correct).length
    setLastSummary({ correct: state.correctCount, wrong: wrongCount })
    setCards(state.cards)
    const db = await openDb()
    await putCards(db, state.cards)
    await putSession(db, {
      id: crypto.randomUUID(),
      profileId: profile.id,
      startedAt: Date.now() - 1, // close enough for MVP; refine in Phase 2
      endedAt: Date.now(),
      answers: state.answers,
    })
    setPhase('summary')
  }

  if (phase === 'loading' || !profile) {
    return <div className="flex h-full items-center justify-center bg-amber-50 text-amber-900">Načítám…</div>
  }

  if (phase === 'home') {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-amber-50 gap-6 p-8">
        <div className="text-9xl">🐝</div>
        <h1 className="text-4xl font-bold text-amber-900">Ahoj, {profile.name}!</h1>
        <p className="text-xl text-amber-800">Pojďme nakrmit včelku.</p>
        <button
          type="button"
          onClick={() => setPhase('playing')}
          className="rounded-2xl bg-amber-500 text-white py-4 px-8 text-2xl font-bold shadow active:scale-95"
        >
          HRÁT
        </button>
      </div>
    )
  }

  if (phase === 'playing') {
    return (
      <SessionScreen
        cards={cards}
        goalCount={beeScene.goalCount}
        scene={beeScene}
        onFinish={onFinish}
      />
    )
  }

  if (phase === 'summary' && lastSummary) {
    return (
      <SessionSummary
        correctCount={lastSummary.correct}
        wrongCount={lastSummary.wrong}
        onPlayAgain={() => setPhase('playing')}
        onDone={() => setPhase('home')}
      />
    )
  }

  return null
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

**Step 3: Run all tests**

Run: `npm test`
Expected: all passing.

**Step 4: Manual end-to-end test in browser**

Run: `npm run dev`. Open `http://localhost:5173`. Verify:
- [ ] Home screen shows "Ahoj, Anička!" with HRÁT button
- [ ] Clicking HRÁT goes to session
- [ ] Question appears (e.g., "5 × 3 = ?")
- [ ] Numpad clicks build up the input
- [ ] Keyboard digits work
- [ ] Backspace and Enter work
- [ ] Correct answer advances, hive fills
- [ ] Wrong answer shows correction prompt
- [ ] Typing the right number advances
- [ ] After 20 correct, summary shows
- [ ] Reload the page → progress is preserved (cards in IndexedDB)

Stop server.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire App with bootstrap, session, summary, persistence"
```

---

## Task 16: Final cleanup and self-review

**Step 1: Run full test suite**

Run: `npm test`
Expected: all green.

**Step 2: Run TypeScript build**

Run: `npm run build`
Expected: clean dist build, no TS errors.

**Step 3: Review checklist**

- [ ] No `console.log` left in source
- [ ] No `TODO` comments without an explanation
- [ ] All Czech user-facing strings, all English code
- [ ] Tailwind classes consistent (no inline `style` except for the dynamic hive width)
- [ ] No unused imports

**Step 4: README placeholder (optional)**

If desired, create a minimal `README.md` with project name, dev commands. Skip if you prefer to add it in Phase 3 along with deployment.

**Step 5: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore: phase 1 cleanup"
```

---

## After Phase 1

Hand off to user for live testing with the daughter. Observations from real use will inform Phase 2 priorities (multi-profile, parent view, heatmap, streaks).

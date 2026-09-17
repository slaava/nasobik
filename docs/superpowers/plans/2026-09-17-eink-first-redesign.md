# E-ink-first redesign with cat companion: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bee theme with a token-driven "school notebook" design (mint colour render, pure black/white e-ink render) and a static cat companion, with no animation library and no CSS that Kindle-class WebKit cannot render.

**Architecture:** Colours become CSS custom properties on `:root`, overridden under `[data-theme="eink"]`; Tailwind gets semantic colour names mapped to those variables so components never mention a hue. The `Scene` abstraction stays: `catScene` supplies a `Hero` (inline-SVG cat head + speech bubble with a deterministic Czech phrase) and a `Container` (session progress dots). `framer-motion` is removed; feedback is expressed by the cat's static expression and bubble text.

**Tech Stack:** React 19, TypeScript, Vite 7 + `@vitejs/plugin-legacy`, Tailwind 3, Vitest + Testing Library (jsdom). Spec: `docs/superpowers/specs/2026-09-17-eink-first-redesign-design.md`.

**Conventions for every task:** run `unset NODE_ENV` once per shell; tests with `npx vitest run <file>`; before each commit run `npx tsc --noEmit && npm run lint --silent && npx vitest run`. One-line commit messages. Never use `dvh`, `gap-*` on a flex container, `aspect-*`, `inset-*`, `:has()`, `color-mix()`, or `@container` (Task 10 adds a test that fails on them).

---

## File map

| File | Responsibility |
|---|---|
| `src/index.css` | Tailwind directives, design tokens on `:root`, e-ink override, dvh fallbacks. |
| `tailwind.config.js` | Semantic colours (`paper`, `ink`, `card`, `accent`, `accent-fg`, `muted`, `fur`, `nose`) → CSS variables. |
| `src/scenes/cat/CatHead.tsx` | Inline SVG cat head, prop `mood`. |
| `src/scenes/cat/phrases.ts` | Czech phrase lists per event, deterministic `pickPhrase`. |
| `src/scenes/cat/Bubble.tsx` | Speech bubble box (border, rounded, tail drawn with a rotated square). |
| `src/scenes/cat/index.tsx` | `catScene: Scene` (Hero = CatHead + Bubble, Container = ProgressDots). |
| `src/scenes/types.ts` | `SceneCtx` gains `streak` and `phraseSeed`. |
| `src/ui/ProgressDots.tsx` | Row of N dots, `filled` of them solid. |
| `src/core/progress.ts` | `masteryDots(cards, mode, total)` and `streakOf(answers)`. |
| `src/ui/HomeScreen.tsx` | Extracted from `App.tsx`: greeting, game rows with mastery dots, today footer. |
| `src/ui/SessionScreen.tsx` | Header with session dots, new tokens, streak/phraseSeed into scene. |
| `src/ui/SessionSummary.tsx`, `ParentGate.tsx`, `ParentSettings.tsx`, `Heatmap.tsx`, `Numpad.tsx`, `ChoiceButtons.tsx`, `ClockFace.tsx` | Recolour to tokens. |
| `src/compat.test.ts` | Static scan guarding against unsupported CSS on old WebKit. |
| removed | `src/scenes/bee/**`, `framer-motion` dependency. |

---

### Task 1: Design tokens and semantic Tailwind colours

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Test: `src/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const tw = readFileSync(new URL('../tailwind.config.js', import.meta.url), 'utf8')

describe('design tokens', () => {
  it.each(['--paper', '--ink', '--card', '--accent', '--accent-fg', '--muted', '--fur', '--nose'])(
    'defines %s on :root and overrides it for e-ink', token => {
      const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
      const eink = css.slice(css.indexOf('[data-theme="eink"] {'), css.indexOf('}', css.indexOf('[data-theme="eink"] {')))
      expect(root).toContain(`${token}:`)
      expect(eink).toContain(`${token}:`)
    })

  it('maps semantic tailwind colours to the variables', () => {
    for (const name of ['paper', 'ink', 'card', 'accent', 'muted', 'fur', 'nose']) {
      expect(tw).toContain(`${name}: 'var(--${name})'`)
    }
    expect(tw).toContain(`'accent-fg': 'var(--accent-fg)'`)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL** (`npx vitest run src/tokens.test.ts`): `:root {` not found.

- [ ] **Step 3: Tailwind config**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        card: 'var(--card)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        muted: 'var(--muted)',
        fur: 'var(--fur)',
        nose: 'var(--nose)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Tokens in CSS.** Replace the top of `src/index.css` (keep the existing "dvh fallback" block at the end untouched; the old `[data-theme="eink"] .bg-amber-*` override block is deleted in Task 9 once nothing uses amber classes):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }

/* Design tokens. Colour render = mint. Shape and text carry every state; colour is additive. */
:root {
  --paper: #f2f8f4;
  --ink: #1f3a34;
  --card: #ffffff;
  --accent: #2f9e78;
  --accent-fg: #ffffff;
  --muted: #cfe3da;
  --fur: #d9d5cf;
  --nose: #e07a8c;
}

/* E-ink render (html[data-theme="eink"], toggled by src/eink.ts): 1-bit safe, no motion. */
[data-theme="eink"] {
  --paper: #ffffff;
  --ink: #000000;
  --card: #ffffff;
  --accent: #000000;
  --accent-fg: #ffffff;
  --muted: #000000;
  --fur: #ffffff;
  --nose: #000000;
}
[data-theme="eink"] *,
[data-theme="eink"] *::before,
[data-theme="eink"] *::after {
  transition: none !important;
  animation: none !important;
  box-shadow: none !important;
}
[data-theme="eink"] .active\:scale-95:active { transform: none; }
[data-theme="eink"] img { filter: grayscale(1) contrast(1.15); }
```

Note: `--muted` is black in e-ink so outlined ("empty") dots still show a full-contrast ring; empty dots are drawn as a ring, filled as a disc, never by lightness alone.

- [ ] **Step 5: Run test, expect PASS.** Then `npm run build --silent` still succeeds.
- [ ] **Step 6: Commit** `git commit -m "feat: design tokens and semantic tailwind colours for the redesign"`

---

### Task 2: `ProgressDots` and `core/progress.ts`

**Files:**
- Create: `src/ui/ProgressDots.tsx`, `src/ui/ProgressDots.test.tsx`
- Create: `src/core/progress.ts`, `src/core/progress.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// src/core/progress.test.ts
import { describe, it, expect } from 'vitest'
import { masteryDots, streakOf } from './progress'
import { freshCard } from './cards'
import type { Card, AnswerEvent } from './types'

const card = (op: Card['op'], a: number, b: number, box: Card['box']): Card => ({ ...freshCard('p', op, a, b), box })

describe('masteryDots', () => {
  it('tables: filled = round(total × cards in box ≥ 3 / all mul+div cards)', () => {
    const cards = [card('mul', 1, 1, 3), card('mul', 1, 2, 5), card('div', 1, 1, 1), card('mul', 1, 3, 2)]
    expect(masteryDots(cards, 'tables', 10)).toBe(5)
  })
  it('tables with no cards → 0', () => {
    expect(masteryDots([], 'tables', 10)).toBe(0)
  })
  it('clock: same rule over clk-* cards only', () => {
    const cards = [card('clk-read', 3, 0, 4), card('clk-read', 4, 0, 1), card('mul', 1, 1, 5)]
    expect(masteryDots(cards, 'clock', 10)).toBe(5)
  })
  it('arith: dots invert the mistake queue; empty queue = all filled, capped at 0', () => {
    expect(masteryDots([], 'arith', 10)).toBe(10)
    expect(masteryDots([card('add', 1, 2, 1), card('sub', 5, 2, 2)], 'arith', 10)).toBe(8)
    const many = Array.from({ length: 14 }, (_, i) => card('add', i + 1, 1, 1))
    expect(masteryDots(many, 'arith', 10)).toBe(0)
  })
})

describe('streakOf', () => {
  const ev = (correct: boolean): AnswerEvent => ({ a: 1, b: 1, correct, rt: 1 })
  it('counts trailing correct answers', () => {
    expect(streakOf([ev(true), ev(false), ev(true), ev(true)])).toBe(2)
    expect(streakOf([ev(true), ev(false)])).toBe(0)
    expect(streakOf([])).toBe(0)
  })
})
```

```tsx
// src/ui/ProgressDots.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressDots } from './ProgressDots'

describe('ProgressDots', () => {
  it('renders total dots with the first `filled` solid', () => {
    const { container } = render(<ProgressDots total={5} filled={2} label="pokrok" />)
    const dots = container.querySelectorAll('[data-dot]')
    expect(dots).toHaveLength(5)
    expect(Array.from(dots).map(d => d.getAttribute('data-dot'))).toEqual(['on', 'on', 'off', 'off', 'off'])
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('pokrok: 2 z 5')
  })
  it('clamps filled into [0, total]', () => {
    const { container } = render(<ProgressDots total={3} filled={7} />)
    expect(container.querySelectorAll('[data-dot="on"]')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run both, expect FAIL** (modules missing).

- [ ] **Step 3: Implement**

```ts
// src/core/progress.ts
import type { AnswerEvent, Card, GameMode } from './types'
import { opsForMode } from './cards'

export const MASTERED_BOX = 3

/**
 * How many of `total` dots to fill on the home screen for a game.
 * tables/clock: share of that game's cards in Box ≥ MASTERED_BOX.
 * arith: the deck is a mistake queue, so dots = total − open mistakes (empty queue = all filled).
 */
export function masteryDots(cards: Card[], mode: GameMode, total: number): number {
  const ops = opsForMode(mode)
  const mine = cards.filter(c => ops.includes(c.op))
  if (mode === 'arith') return Math.max(0, total - mine.length)
  if (mine.length === 0) return 0
  const mastered = mine.filter(c => c.box >= MASTERED_BOX).length
  return Math.round((total * mastered) / mine.length)
}

/** Number of consecutive correct answers at the end of the list. */
export function streakOf(answers: AnswerEvent[]): number {
  let n = 0
  for (let i = answers.length - 1; i >= 0 && answers[i]!.correct; i--) n++
  return n
}
```

```tsx
// src/ui/ProgressDots.tsx
type Props = { total: number; filled: number; label?: string; className?: string }

// Filled = solid disc, empty = ring. Never rely on lightness: e-ink maps --muted to black.
export function ProgressDots({ total, filled, label, className }: Props) {
  const n = Math.max(0, Math.min(total, Math.round(filled)))
  return (
    <span role="img" aria-label={label ? `${label}: ${n} z ${total}` : `${n} z ${total}`} className={`inline-flex ${className ?? ''}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-dot={i < n ? 'on' : 'off'}
          className={`inline-block w-2 h-2 rounded-full border-[1.5px] mr-1 last:mr-0 ${i < n ? 'bg-accent border-accent' : 'bg-transparent border-muted'}`}
        />
      ))}
    </span>
  )
}
```

- [ ] **Step 4: Run tests, expect PASS.**
- [ ] **Step 5: Commit** `git commit -m "feat: progress dots component and mastery/streak helpers"`

---

### Task 3: `phrases.ts`

**Files:**
- Create: `src/scenes/cat/phrases.ts`, `src/scenes/cat/phrases.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/scenes/cat/phrases.test.ts
import { describe, it, expect } from 'vitest'
import { PHRASES, pickPhrase, moodFor, type CatEvent } from './phrases'

const EVENTS: CatEvent[] = ['greeting', 'correct', 'streak', 'wrong', 'dunno', 'finish-good', 'finish-mixed']

describe('phrases', () => {
  it.each(EVENTS)('%s has at least 3 phrases', ev => {
    expect(PHRASES[ev].length).toBeGreaterThanOrEqual(3)
  })
  it('is deterministic in the seed and cycles', () => {
    expect(pickPhrase('correct', 0)).toBe(PHRASES.correct[0])
    expect(pickPhrase('correct', PHRASES.correct.length)).toBe(PHRASES.correct[0])
    expect(pickPhrase('correct', 7)).toBe(pickPhrase('correct', 7))
  })
  it('substitutes the name', () => {
    expect(pickPhrase('greeting', 0, 'Ema')).toContain('Ema')
    expect(pickPhrase('greeting', 0, 'Ema')).not.toContain('{name}')
  })
  it('maps events to moods', () => {
    expect(moodFor('greeting')).toBe('neutral')
    expect(moodFor('correct')).toBe('happy')
    expect(moodFor('streak')).toBe('happy')
    expect(moodFor('finish-good')).toBe('happy')
    expect(moodFor('wrong')).toBe('surprised')
    expect(moodFor('dunno')).toBe('surprised')
    expect(moodFor('finish-mixed')).toBe('neutral')
  })
})
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**

```ts
// src/scenes/cat/phrases.ts
export type CatEvent = 'greeting' | 'correct' | 'streak' | 'wrong' | 'dunno' | 'finish-good' | 'finish-mixed'
export type CatMood = 'neutral' | 'happy' | 'surprised'

// Czech, child-facing. `{name}` is replaced by the child's name.
export const PHRASES: Record<CatEvent, readonly string[]> = {
  greeting: ['Ahoj, {name}! Co dneska?', 'Čau, {name}. Jdeme na to?', 'Ahoj! Jednu hru?', '{name}, mám na tebe chuť… na počítání!'],
  correct: ['Přesně tak!', 'Jo, to je ono.', 'Správně!', 'Mňau, dobrý.', 'Tu už znáš.'],
  streak: ['Tři v řadě!', 'Jedeš jak drak.', 'Nezastavitelná!', 'Tohle ti jde.'],
  wrong: ['Hm, skoro. Zkus to napsat.', 'Nevadí, příště to bude.', 'Mrkni, jak to je, a napiš to.', 'To se stane i mně.'],
  dunno: ['Dobře, ukážu ti to.', 'Podívej, takhle.', 'Tak si to zapamatujeme.'],
  'finish-good': ['Hotovo! Paráda.', 'To bylo krásné počítání.', 'Mňau! Zvládnuto.', 'Dneska skvěle.'],
  'finish-mixed': ['Hotovo. Pár věcí si ještě zopakujeme.', 'Dobrá práce, něco ještě doladíme.', 'Zvládnuto, ty těžší se vrátí.'],
}

export function pickPhrase(event: CatEvent, seed: number, name = ''): string {
  const list = PHRASES[event]
  const text = list[Math.abs(seed) % list.length]!
  return text.replace('{name}', name)
}

export function moodFor(event: CatEvent): CatMood {
  switch (event) {
    case 'correct':
    case 'streak':
    case 'finish-good':
      return 'happy'
    case 'wrong':
    case 'dunno':
      return 'surprised'
    default:
      return 'neutral'
  }
}
```

- [ ] **Step 4: Run, expect PASS.** **Step 5: Commit** `git commit -m "feat: cat companion phrase dictionary"`

---

### Task 4: `CatHead` and `Bubble`

**Files:**
- Create: `src/scenes/cat/CatHead.tsx`, `src/scenes/cat/Bubble.tsx`, `src/scenes/cat/CatHead.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
// src/scenes/cat/CatHead.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatHead } from './CatHead'
import { Bubble } from './Bubble'

describe('CatHead', () => {
  it.each(['neutral', 'happy', 'surprised'] as const)('renders one svg for mood %s', mood => {
    const { container } = render(<CatHead mood={mood} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('data-mood')).toBe(mood)
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 100')
  })
  it('uses tokens, not literal colours', () => {
    const { container } = render(<CatHead mood="neutral" />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i)
    expect(container.innerHTML).toContain('var(--ink)')
  })
})

describe('Bubble', () => {
  it('renders its text', () => {
    render(<Bubble>Ahoj!</Bubble>)
    expect(screen.getByText('Ahoj!')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Head "A" from the mockups: wide flat head, dot eyes far apart, whiskers. Eyes and mouth change per mood; everything else is shared.

```tsx
// src/scenes/cat/CatHead.tsx
import type { CatMood } from './phrases'

type Props = { mood: CatMood; className?: string }

const INK = 'var(--ink)'
const FUR = 'var(--fur)'
const NOSE = 'var(--nose)'

// Wide, flat head with small dot eyes and whiskers. Stroke 2.6/1.8 so the
// outline survives 1-bit e-ink. Only eyes and mouth differ per mood.
export function CatHead({ mood, className }: Props) {
  return (
    <svg viewBox="0 0 120 100" role="img" aria-label="kočka" data-mood={mood} className={className}>
      <path
        d="M14 52 Q14 30 30 26 L34 8 L52 24 Q60 22 68 24 L86 8 L90 26 Q106 30 106 52 Q106 86 60 88 Q14 86 14 52 Z"
        fill={FUR} stroke={INK} strokeWidth="2.6" strokeLinejoin="round"
      />
      <path d="M36 24 L37 14 L46 22 M84 24 L83 14 L74 22" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
      {mood === 'happy' ? (
        <path d="M36 54 q8 -8 16 0 M68 54 q8 -8 16 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      ) : mood === 'surprised' ? (
        <>
          <circle cx="44" cy="52" r="5" fill={FUR} stroke={INK} strokeWidth="2" />
          <circle cx="76" cy="52" r="5" fill={FUR} stroke={INK} strokeWidth="2" />
          <circle cx="44" cy="52" r="2" fill={INK} />
          <circle cx="76" cy="52" r="2" fill={INK} />
        </>
      ) : (
        <>
          <circle cx="44" cy="52" r="3" fill={INK} />
          <circle cx="76" cy="52" r="3" fill={INK} />
        </>
      )}
      <path d="M57 62 L63 62 L60 66 Z" fill={NOSE} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      {mood === 'surprised' ? (
        <ellipse cx="60" cy="72" rx="3.5" ry="4" fill="none" stroke={INK} strokeWidth="2.6" />
      ) : (
        <path d="M60 66 Q55 71 50 68 M60 66 Q65 71 70 68" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      )}
      <path d="M6 56 L28 58 M6 66 L28 62 M114 56 L92 58 M114 66 L92 62" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
```

```tsx
// src/scenes/cat/Bubble.tsx
import type { ReactNode } from 'react'

// Speech bubble pointing left (towards the cat). The tail is a rotated square
// with two borders, which every WebKit renders; no pseudo-elements needed.
export function Bubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border-2 border-ink bg-card px-3 py-2 text-ink ${className ?? ''}`}>
      <span
        aria-hidden
        className="absolute -left-[7px] top-4 block h-3 w-3 rotate-45 border-b-2 border-l-2 border-ink bg-card"
      />
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS.** **Step 5: Commit** `git commit -m "feat: cat head svg with three moods and speech bubble"`

---

### Task 5: `catScene` and extended `SceneCtx`

**Files:**
- Modify: `src/scenes/types.ts`
- Create: `src/scenes/cat/index.tsx`, `src/scenes/cat/cat.test.tsx`
- Modify: `src/scenes/bee/bee.test.tsx` (add the two new ctx fields to its renders so it keeps compiling until Task 9 deletes it)

- [ ] **Step 1: Extend the context**

```ts
// src/scenes/types.ts
import type { ComponentType } from 'react'

export type SceneCtx = {
  correctCount: number
  wrongCount: number
  goalCount: number
  lastEvent: 'correct' | 'wrong' | 'dunno' | 'idle'
  /** Trailing correct answers, for "streak" phrases. */
  streak: number
  /** Deterministic seed for phrase selection (answers so far). */
  phraseSeed: number
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

Update every `<Hero …/>` / `<Container …/>` call in `src/scenes/bee/bee.test.tsx` to pass `streak={0} phraseSeed={0}`. The bee `Bee.tsx` accepts `SceneCtx` so it still compiles.

- [ ] **Step 2: Failing test**

```tsx
// src/scenes/cat/cat.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { catScene } from '.'
import { PHRASES } from './phrases'

const base = { correctCount: 0, wrongCount: 0, goalCount: 20, streak: 0, phraseSeed: 0 }

describe('catScene', () => {
  it('exposes id and goalCount', () => {
    expect(catScene.id).toBe('cat')
    expect(catScene.goalCount).toBe(20)
  })
  it('Hero: idle → neutral cat, no bubble text from answer events', () => {
    const { container } = render(<catScene.Hero {...base} lastEvent="idle" />)
    expect(container.querySelector('svg[data-mood="neutral"]')).not.toBeNull()
  })
  it('Hero: correct → happy + a correct phrase', () => {
    render(<catScene.Hero {...base} correctCount={1} lastEvent="correct" streak={1} phraseSeed={1} />)
    expect(document.querySelector('svg[data-mood="happy"]')).not.toBeNull()
    expect(screen.getByText(PHRASES.correct[1 % PHRASES.correct.length]!)).toBeInTheDocument()
  })
  it('Hero: 3-streak → streak phrase', () => {
    render(<catScene.Hero {...base} correctCount={3} lastEvent="correct" streak={3} phraseSeed={3} />)
    expect(screen.getByText(PHRASES.streak[3 % PHRASES.streak.length]!)).toBeInTheDocument()
  })
  it('Hero: wrong → surprised, dunno → surprised', () => {
    const { unmount } = render(<catScene.Hero {...base} wrongCount={1} lastEvent="wrong" phraseSeed={1} />)
    expect(document.querySelector('svg[data-mood="surprised"]')).not.toBeNull()
    unmount()
    render(<catScene.Hero {...base} wrongCount={1} lastEvent="dunno" phraseSeed={1} />)
    expect(screen.getByText(PHRASES.dunno[1 % PHRASES.dunno.length]!)).toBeInTheDocument()
  })
  it('Container renders goalCount dots with correctCount filled', () => {
    const { container } = render(<catScene.Container {...base} correctCount={7} lastEvent="idle" />)
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(20)
    expect(container.querySelectorAll('[data-dot="on"]')).toHaveLength(7)
  })
})
```

- [ ] **Step 3: Implement**

```tsx
// src/scenes/cat/index.tsx
import type { Scene, SceneCtx } from '../types'
import { CatHead } from './CatHead'
import { Bubble } from './Bubble'
import { moodFor, pickPhrase, type CatEvent } from './phrases'
import { ProgressDots } from '../../ui/ProgressDots'

function eventOf(ctx: SceneCtx): CatEvent | null {
  if (ctx.lastEvent === 'idle') return null
  if (ctx.lastEvent === 'correct') return ctx.streak >= 3 ? 'streak' : 'correct'
  return ctx.lastEvent // 'wrong' | 'dunno'
}

function CatHero(ctx: SceneCtx) {
  const event = eventOf(ctx)
  const mood = event ? moodFor(event) : 'neutral'
  return (
    <div className="flex items-center">
      <CatHead mood={mood} className="w-24 h-20 lg:w-48 lg:h-40 shrink-0" />
      {event && <Bubble className="ml-2 text-sm lg:text-lg">{pickPhrase(event, ctx.phraseSeed)}</Bubble>}
    </div>
  )
}

function SessionDots({ correctCount, goalCount }: SceneCtx) {
  return <ProgressDots total={goalCount} filled={correctCount} label="Sezení" className="mt-2" />
}

export const catScene: Scene = {
  id: 'cat',
  name: 'Kočka',
  thumbnail: '🐱',
  goalCount: 20,
  Hero: CatHero,
  Container: SessionDots,
}
```

- [ ] **Step 4: Run `npx vitest run src/scenes`, expect PASS; `npx tsc --noEmit` clean.**
- [ ] **Step 5: Commit** `git commit -m "feat: cat scene with mood, phrases and session dots"`

---

### Task 6: `SessionScreen` on the new design

**Files:**
- Modify: `src/ui/SessionScreen.tsx`, `src/ui/SessionScreen.test.tsx`
- Modify: `src/ui/Numpad.tsx`, `src/ui/ChoiceButtons.tsx`, `src/ui/ClockFace.tsx`
- Modify: `src/App.tsx` (wire `catScene`)

- [ ] **Step 1: Failing test additions** (append to `SessionScreen.test.tsx`; reuse that file's existing helpers for cards/props and import `catScene` from `../scenes/cat`):

```tsx
it('shows the game name and 20 session dots in the header', () => {
  render(<SessionScreen cards={cards} goalCount={20} scene={catScene} mode="tables" onFinish={() => {}} />)
  expect(screen.getByText('Násobení')).toBeInTheDocument()
  expect(document.querySelectorAll('[data-dot]')).toHaveLength(20)
  expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull()
})

it('passes "dunno" to the scene when the child gives up', async () => {
  render(<SessionScreen cards={cards} goalCount={20} scene={catScene} mode="tables" onFinish={() => {}} />)
  await userEvent.click(screen.getByText('Já nevím'))
  expect(document.querySelector('svg[data-mood="surprised"]')).not.toBeNull()
})
```

Existing tests that render with `beeScene` switch to `catScene`. A test asserting the bee image is deleted.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement.** In `SessionScreen.tsx`:
  - `lastEventOf` returns `'dunno'` when the last answer has `rt === 0 && !correct` (the "Já nevím" dispatch uses `value: -1, rt: 0`), else `'correct' | 'wrong'`.
  - `sceneCtx` adds `streak: streakOf(state.answers)` and `phraseSeed: state.answers.length` (import from `../core/progress`).
  - Header: `<header className="flex items-center justify-between px-4 pt-3"><span className="font-bold text-ink">{MODE_LABEL[mode]}</span><Container {...sceneCtx} /></header>` with `const MODE_LABEL: Record<GameMode, string> = { tables: 'Násobení', arith: 'Sčítání a odčítání', clock: 'Hodiny' }`. Remove `<Container/>` from under the Hero.
  - Colours: `bg-amber-50 → bg-paper`, `text-amber-900/800/700 → text-ink`, `text-amber-600 → text-ink`. Answer field: `border-b-[3px] border-accent bg-transparent text-ink` without `shadow` or `bg-white`. Idle/finished placeholders use `bg-paper`.
  - Replace flex `gap-*` with margins on children (`mt-2`, `ml-2`); grid `gap` on the numpad is fine. Keep `[@media(min-height:760px)]` responsive pattern and vh sizes as they are (the CSS fallback covers the existing dvh classes; do not add new ones).
  - `Numpad.tsx`: digit keys `rounded-xl border-[1.5px] border-ink bg-card text-ink font-bold`; ⌫ `bg-muted text-ink` in colour, still bordered; ✓ `bg-accent text-accent-fg border-accent`. Drop `shadow-md`/`transition`. In e-ink `--muted` is black, so give ⌫ the class pair `bg-muted text-accent-fg` **only when** the theme is e-ink? No: keep it simple, ⌫ is `bg-card` with a bordered outline in both renders; the spec's "muted" ⌫ is dropped as a YAGNI simplification.
  - `ChoiceButtons.tsx`: same key styling as digits.
  - `ClockFace.tsx`: `fill="white"` → `fill="var(--card)"`, strokes `#fcd34d`, `#92400e`, `#78350f` → `var(--ink)`, minute hand/ring `#2563eb` → `var(--accent)`, numerals `fill="var(--ink)"`. `DigitalDisplay`: `bg-ink text-paper` (inverse panel), no `shadow-inner`.
  - `App.tsx`: `import { catScene } from './scenes/cat'`, replace `beeScene` uses.

- [ ] **Step 4: Run `npx vitest run src/ui/SessionScreen.test.tsx`, then whole suite; tsc; lint.**
- [ ] **Step 5: Commit** `git commit -m "feat: session screen on notebook design with cat companion and dot progress"`

---

### Task 7: `HomeScreen`

**Files:**
- Create: `src/ui/HomeScreen.tsx`, `src/ui/HomeScreen.test.tsx`
- Modify: `src/App.tsx` (replace the inline `phase === 'home'` JSX)

- [ ] **Step 1: Failing test**

```tsx
// src/ui/HomeScreen.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeScreen } from './HomeScreen'
import { freshCard } from '../core/cards'
import type { Card, Profile, Session } from '../core/types'

const profile: Profile = { id: 'p', name: 'Ema', avatar: '', createdAt: 0, unlockedTables: [1], selectedScene: 'cat', divisionEnabled: false, arithEnabled: true, clockEnabled: false, clockLevels: [] }
const c = (op: Card['op'], a: number, b: number, box: Card['box']): Card => ({ ...freshCard('p', op, a, b), box })
const cards = [c('mul', 1, 1, 5), c('mul', 1, 2, 1)]
const today: Session = { id: 's', profileId: 'p', startedAt: Date.now() - 1000, endedAt: Date.now(), answers: [{ a: 1, b: 1, correct: true, rt: 1 }, { a: 1, b: 2, correct: false, rt: 1 }] }

describe('HomeScreen', () => {
  it('greets by name from the cat bubble', () => {
    render(<HomeScreen profile={profile} cards={cards} sessions={[]} onPlay={() => {}} onParent={() => {}} />)
    expect(screen.getByText(/Ema/)).toBeInTheDocument()
    expect(document.querySelector('svg[data-mood="neutral"]')).not.toBeNull()
  })
  it('lists one row per enabled game with mastery dots', () => {
    render(<HomeScreen profile={profile} cards={cards} sessions={[]} onPlay={() => {}} onParent={() => {}} />)
    const tables = screen.getByRole('button', { name: /Násobení/ })
    expect(tables.querySelectorAll('[data-dot]')).toHaveLength(10)
    expect(tables.querySelectorAll('[data-dot="on"]')).toHaveLength(5)
    expect(screen.getByRole('button', { name: /Sčítání a odčítání/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hodiny/ })).toBeNull()
  })
  it('starts the chosen game', async () => {
    const onPlay = vi.fn()
    render(<HomeScreen profile={profile} cards={cards} sessions={[]} onPlay={onPlay} onParent={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Sčítání/ }))
    expect(onPlay).toHaveBeenCalledWith('arith')
  })
  it('shows today summary', () => {
    render(<HomeScreen profile={profile} cards={cards} sessions={[today]} onPlay={() => {}} onParent={() => {}} />)
    expect(screen.getByText('Dnes: 1 hra · 1 správně')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**

```tsx
// src/ui/HomeScreen.tsx
import type { Card, GameMode, Profile, Session } from '../core/types'
import { masteryDots } from '../core/progress'
import { todayStats } from '../core/stats'
import { CatHead } from '../scenes/cat/CatHead'
import { Bubble } from '../scenes/cat/Bubble'
import { pickPhrase } from '../scenes/cat/phrases'
import { ProgressDots } from './ProgressDots'

type Props = {
  profile: Profile
  cards: Card[]
  sessions: Session[]
  onPlay: (mode: GameMode) => void
  onParent: () => void
}

const GAMES: { mode: GameMode; glyph: string; label: string; enabled: (p: Profile) => boolean }[] = [
  { mode: 'tables', glyph: '× ÷', label: 'Násobení', enabled: () => true },
  { mode: 'arith', glyph: '+ −', label: 'Sčítání a odčítání', enabled: p => p.arithEnabled },
  { mode: 'clock', glyph: '🕒', label: 'Hodiny', enabled: p => p.clockEnabled },
]

function plural(n: number, one: string, few: string, many: string) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many
}

export function HomeScreen({ profile, cards, sessions, onPlay, onParent }: Props) {
  const today = todayStats(sessions)
  const todaySessions = sessions.filter(s => new Date(s.startedAt).toDateString() === new Date().toDateString()).length
  const todayCorrect = Math.round((today.questions * today.correctPct) / 100)
  // Seed the greeting by day so it changes daily but not on every re-render.
  const seed = Math.floor(Date.now() / 86_400_000)
  return (
    <div className="relative flex flex-col h-full bg-paper text-ink px-4 pt-10 pb-4 lg:max-w-xl lg:mx-auto">
      <button type="button" onClick={onParent} aria-label="Pro rodiče" className="absolute top-3 right-4 text-2xl">⚙️</button>
      <div className="flex items-end">
        <CatHead mood="neutral" className="w-28 h-24 shrink-0" />
        <Bubble className="ml-2 text-base">{pickPhrase('greeting', seed, profile.name)}</Bubble>
      </div>
      <div className="flex flex-col mt-6">
        {GAMES.filter(g => g.enabled(profile)).map(g => (
          <button
            key={g.mode}
            type="button"
            onClick={() => onPlay(g.mode)}
            className="flex items-center rounded-xl border-[1.5px] border-ink bg-card px-3 py-3 mb-3 text-left active:scale-95"
          >
            <span className="w-10 text-center text-lg font-bold">{g.glyph}</span>
            <span className="ml-2 font-bold text-base">{g.label}</span>
            <ProgressDots total={10} filled={masteryDots(cards, g.mode, 10)} label={g.label} className="ml-auto" />
          </button>
        ))}
      </div>
      <p className="mt-auto text-center text-sm text-ink">
        Dnes: {todaySessions} {plural(todaySessions, 'hra', 'hry', 'her')} · {todayCorrect} správně
      </p>
    </div>
  )
}
```

In `App.tsx` the `phase === 'home'` branch becomes:

```tsx
if (phase === 'home') {
  return (
    <HomeScreen
      profile={profile}
      cards={cards}
      sessions={sessions}
      onPlay={m => { setMode(m); setPhase('playing') }}
      onParent={() => setPhase('parent-gate')}
    />
  )
}
```

Remove the `games` array and the `beeIdleUrl` import from `App.tsx`. The loading placeholder becomes `bg-paper text-ink`.

- [ ] **Step 4: Run tests, tsc, lint.** **Step 5: Commit** `git commit -m "feat: home screen with cat greeting, game rows and mastery dots"`

---

### Task 8: Summary, gate, parent settings, heatmap on tokens

**Files:**
- Modify: `src/ui/SessionSummary.tsx`, `src/ui/SessionSummary.test.tsx`, `src/ui/ParentGate.tsx`, `src/ui/ParentSettings.tsx`, `src/ui/Heatmap.tsx`, `src/ui/Heatmap.test.tsx`

- [ ] **Step 1: Failing tests.** In `SessionSummary.test.tsx` add:

```tsx
it('shows a happy cat and a finish phrase; mixed results pick the mixed list', () => {
  render(<SessionSummary correctCount={20} wrongCount={0} onPlayAgain={() => {}} onDone={() => {}} />)
  expect(document.querySelector('svg[data-mood="happy"]')).not.toBeNull()
  expect(screen.getByText(PHRASES['finish-good'][20 % PHRASES['finish-good'].length]!)).toBeInTheDocument()
  cleanup()
  render(<SessionSummary correctCount={20} wrongCount={4} onPlayAgain={() => {}} onDone={() => {}} />)
  expect(document.querySelector('svg[data-mood="neutral"]')).not.toBeNull()
})
```

In `Heatmap.test.tsx` replace colour-class assertions with `data-box` assertions only, and add:

```tsx
it('uses a grey ramp via data-box, not hue classes', () => {
  const { container } = render(<Heatmap cards={cards} unlockedTables={[1]} divisionEnabled={false} />)
  expect(container.innerHTML).not.toMatch(/bg-(red|orange|yellow|lime|green|gray)-/)
})
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**
  - `SessionSummary.tsx`: `const good = wrongCount === 0 || wrongCount * 4 <= correctCount` (mixed when more than 20% wrong); `<CatHead mood={good ? 'happy' : 'neutral'} className="w-40 h-32" />`, `<Bubble>{pickPhrase(good ? 'finish-good' : 'finish-mixed', correctCount + wrongCount)}</Bubble>`; buttons: filled `bg-accent text-accent-fg border-2 border-accent` and outlined `bg-card text-ink border-2 border-ink`; page `bg-paper text-ink`; replace `gap-*` by margins. Remove the bee image import.
  - `ParentGate.tsx`, `ParentSettings.tsx`: amber → tokens (`bg-amber-50 → bg-paper`, `text-amber-* → text-ink`, `bg-white shadow → bg-card border-[1.5px] border-ink`, `bg-amber-500 text-white → bg-accent text-accent-fg`, `bg-amber-300` selected level → `bg-accent text-accent-fg`). Error ring on the gate input → `border-2 border-nose`.
  - `Heatmap.tsx`: drop `BOX_COLOR`; cells get `style={{ background: RAMP[box] }}` with `const RAMP = ['var(--card)', '#e6e6e6', '#bfbfbf', '#8c8c8c', '#4d4d4d', 'var(--ink)']` and class `border border-ink`. Box 0 is card-coloured with border (locked/unseen), box 5 is ink. Labels `text-ink`.

- [ ] **Step 4: Run whole suite, tsc, lint.** **Step 5: Commit** `git commit -m "feat: summary, parent screens and heatmap on design tokens"`

---

### Task 9: Remove the bee and framer-motion, clean the e-ink CSS

**Files:**
- Delete: `src/scenes/bee/` (whole directory, including `assets/bee-idle.svg`)
- Modify: `package.json`, `package-lock.json`, `src/index.css`

- [ ] **Step 1:** `grep -rn "bee\|framer" src` must list nothing after deleting the directory; fix any hit.
- [ ] **Step 2:** `npm uninstall framer-motion --no-audit --no-fund`.
- [ ] **Step 3:** In `src/index.css` delete the old per-class override block (everything from the comment "E-ink mode (html[data-theme="eink"]…" through `.ring-red-300 { --tw-ring-color: #000; }`), keeping the token block from Task 1 and the dvh fallback block. Then `grep -n "amber\|lime\|slate\|gray-" src -r` must list nothing.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint --silent && npx vitest run && npm run build --silent`. Check `dist/assets` has no `bee-idle` file and the JS bundle shrank (framer-motion was ~100 kB gzip of the 112 kB).
- [ ] **Step 5: Commit** `git commit -m "chore: remove bee scene and framer-motion"`

---

### Task 10: Old-WebKit compatibility guard

**Files:**
- Create: `src/compat.test.ts`

- [ ] **Step 1: Write the test** (it is the implementation; it must pass on the finished code):

```ts
// src/compat.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Kindle-class WebKit: no dvh (without vh fallback), no gap on flex, no aspect-ratio,
// no inset-*, no :has(), no color-mix(), no container queries.
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts|css)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

const src = join(__dirname)
const files = walk(src)
const css = readFileSync(join(src, 'index.css'), 'utf8')

describe('old WebKit compatibility', () => {
  it('every dvh utility has a vh fallback in index.css', () => {
    const used = new Set<string>()
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/[\w:-]*\[(\d+)dvh\]|\bh-dvh\b/g)) used.add(m[0].replace(/^.*?:/, ''))
    }
    for (const cls of used) {
      const n = cls.match(/\[(\d+)dvh\]/)?.[1]
      const needle = cls === 'h-dvh' ? 'height: 100vh; height: 100dvh' : `${n}vh; ${cls.split('-[')[0].replace('h', 'height').replace('w', 'width').replace('max-height', 'max-height')}`
      expect(css, `missing vh fallback for ${cls}`).toContain(n ? `${n}vh; ` : needle)
    }
  })

  it('does not use flex gap, aspect-ratio, inset utilities or modern CSS functions', () => {
    const bad: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      for (const line of text.split('\n')) {
        if (/className=.*\bflex\b(?![-\w]).*\bgap-/.test(line) && !/\bgrid\b/.test(line)) bad.push(`${f}: flex+gap: ${line.trim()}`)
        if (/\baspect-|\binset-|:has\(|color-mix\(|@container/.test(line)) bad.push(`${f}: ${line.trim()}`)
      }
    }
    expect(bad).toEqual([])
  })
})
```

- [ ] **Step 2: Run, fix every reported line** (replace flex `gap-*` with margins, etc.) until it passes. The dvh check only needs `${n}vh; ` to be present for each used number, which the existing fallback block satisfies.
- [ ] **Step 3: Commit** `git commit -m "test: guard against CSS unsupported by old e-ink WebKit"`

---

### Task 11: Docs and final verification

- [ ] **Step 1:** Update `CLAUDE.md`: replace the bee/framer-motion paragraphs in *Architecture* (`src/scenes/`, `src/ui/`) with: scenes = `cat` only; `SceneCtx` fields; no animation library; tokens in `index.css` + semantic Tailwind colours; e-ink switch (`src/eink.ts`, `?eink=1`); compat rules enforced by `src/compat.test.ts`. Add to *Behaviours that bite*: "No `dvh` without a vh fallback, no flex `gap`: Kindle WebKit".
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint --silent && npx vitest run && npm run build --silent` all green.
- [ ] **Step 3:** `npm run dev`, open `http://localhost:5173/` and `/?eink=1` at 480×800, walk home → tables → summary → parent settings → clock game. No amber anywhere, dots visible, cat mood changes on correct/wrong/"Já nevím".
- [ ] **Step 4: Commit** `git commit -m "docs: describe cat scene, tokens and e-ink compatibility rules"`
- [ ] **Step 5:** Push to `main` only when the user asks; then verify on the Kindle (`?eink=1`) and on a phone.

---

## Self-review

- Spec coverage: §1 → T1, T6-T8; §2 → T9 (framer removed), T1 (transitions off); §3 → T3-T5; §4 home → T7, session → T6, summary → T8, parent/heatmap → T8; §5 → T10, dvh fallbacks kept in T1/T9; testing → each task.
- Names used consistently: `ProgressDots{total,filled,label}`, `masteryDots(cards, mode, total)`, `streakOf`, `pickPhrase(event, seed, name)`, `moodFor`, `CatHead{mood}`, `Bubble`, `catScene`, `SceneCtx.streak/phraseSeed`, `lastEvent` includes `'dunno'`.
- Known simplification vs spec: ⌫ key is outlined like digits instead of `--muted` (T6), because `--muted` is black in e-ink and would make ⌫ a second filled key.

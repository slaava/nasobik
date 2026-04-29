# Násobík Phase 3 Implementation Plan — "Distribution"

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Phase 2 app installable, multi-scene, and shareable. Add PWA support (manifest, service worker, offline, installable icon), a second scene as proof of architectural extensibility, an organic "decorative meadow" reward, and a deployment to a public URL.

**Architecture:** Builds on Phase 2. Adds `vite-plugin-pwa` for the PWA shell. Introduces a second scene (`flower`) implementing the existing `Scene` interface — no engine changes required. Adds a tiny `Meadow` decorative layer that grows with sessions (purely visual). Deploys static build to Cloudflare Pages (or Vercel — pick one).

**Tech Stack:** Adds `vite-plugin-pwa`, `workbox-window` (transitively).

**Reference:** See `docs/plans/2026-04-29-nasobik-design.md` and Phase 1+2 plans.

**Prerequisite:** Phase 2 plan complete and merged.

---

## Scope of Phase 3

**In scope:**
- PWA manifest, service worker, offline shell
- Installable on iOS/Android (add-to-home-screen)
- Custom app icon (SVG-based, generated for required sizes)
- Second scene `flower` (vodu nalévám do kytky)
- Scene picker on home screen (only shows when >1 scene exists per profile)
- Decorative "meadow" — small items appear behind the bee/flower as the profile accumulates sessions
- Deployment to Cloudflare Pages (or chosen host)
- Public URL ready to share

**Out of scope (explicit YAGNI):**
- Replacing emoji with hand-drawn SVG (judge after live use)
- Cloud sync, accounts
- Internationalization (Czech-only, by design)
- Speed mode / "Závod včelky" (would warrant its own phase if pursued)

---

## Conventions

- Same as previous phases.
- New scenes go under `src/scenes/<id>/` with the same component file structure as `bee/`.

---

## Task 1: Install and configure vite-plugin-pwa

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/icon.svg`

**Step 1: Install**

Run:
```bash
npm install -D vite-plugin-pwa
```

**Step 2: Generate app icons**

Approach: design once as SVG, export to PNG sizes.

Create `public/icon.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#fef3c7"/>
  <text x="256" y="370" font-size="320" text-anchor="middle">🐝</text>
</svg>
```

Generate raster PNGs from this SVG at 192×192 and 512×512:

```bash
# If imagemagick is installed:
magick -background none -density 1024 public/icon.svg -resize 192x192 public/icon-192.png
magick -background none -density 1024 public/icon.svg -resize 512x512 public/icon-512.png
```

If imagemagick is not available, use any tool (Figma, Inkscape, online converter) to produce these two PNGs.

**Step 3: Configure plugin in `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'sounds/*.mp3'],
      manifest: {
        name: 'Násobík',
        short_name: 'Násobík',
        description: 'Trénování malé násobilky pro děti',
        theme_color: '#f59e0b',
        background_color: '#fef3c7',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'cs',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,woff2}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Step 4: Verify build produces a service worker**

Run: `npm run build`
Expected: `dist/sw.js`, `dist/manifest.webmanifest`, all assets present.

**Step 5: Verify PWA in browser**

Run: `npm run preview`
Open in Chrome (not dev mode), open DevTools → Application → Manifest. Verify:
- Manifest is valid
- Service Worker is registered
- App is installable (install icon in address bar)

Stop server.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest, icons, and service worker"
```

---

## Task 2: Verify offline behavior

**Step 1: Build and preview**

Run: `npm run build && npm run preview`

**Step 2: In Chrome DevTools**

- Open the app
- Application → Service Workers → confirm "activated"
- Network tab → set to "Offline"
- Reload the page — app should still load (shell from service worker, data from IndexedDB)
- Play a session — should still work

**Step 3: Document any caveats**

If something doesn't work offline (e.g. fonts loaded from a CDN), either bundle them or accept the limitation. For MVP we don't load anything from CDN, so this should be clean.

**Step 4: Commit any fixes (if needed)**

If you had to bundle a font or fix an asset path, commit that change.

```bash
git add -A
git commit -m "fix: bundle <asset> for offline support"
```

---

## Task 3: Second scene — `flower` (sceneId: `flower`)

**Files:**
- Create: `src/scenes/flower/index.tsx`
- Create: `src/scenes/flower/Flower.tsx`
- Create: `src/scenes/flower/Watering.tsx`

**Concept:** A wilted flower (🥀 → 🌱 → 🌿 → 🌸 → 🌻) grows as the child answers correctly. The "container" is a watering can (🪣 / 💧). Wrong answers don't kill it; just no growth.

**Step 1: Implement Flower (Hero)**

Create `src/scenes/flower/Flower.tsx`:

```tsx
import { motion } from 'framer-motion'
import type { SceneCtx } from '../types'

const STAGES = ['🥀', '🌱', '🌿', '🌷', '🌻']

export function Flower({ correctCount, goalCount, lastEvent }: SceneCtx) {
  const ratio = goalCount === 0 ? 0 : Math.min(correctCount / goalCount, 1)
  const stage = Math.min(STAGES.length - 1, Math.floor(ratio * STAGES.length))

  return (
    <motion.div
      key={stage} // re-trigger animation when stage changes
      initial={{ scale: 0.85 }}
      animate={
        lastEvent === 'correct'
          ? { scale: [0.85, 1.1, 1] }
          : lastEvent === 'wrong'
          ? { x: [0, -6, 6, 0] }
          : { scale: 1, y: [0, -3, 0] }
      }
      transition={
        lastEvent === 'idle'
          ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.5 }
      }
      className="text-7xl select-none"
    >
      {STAGES[stage]}
    </motion.div>
  )
}
```

**Step 2: Implement Watering (Container)**

Create `src/scenes/flower/Watering.tsx`:

```tsx
import type { SceneCtx } from '../types'

export function Watering({ correctCount, goalCount }: SceneCtx) {
  const ratio = goalCount === 0 ? 0 : Math.min(correctCount / goalCount, 1)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-5xl">💧</div>
      <div className="w-32 h-3 rounded-full bg-blue-100 overflow-hidden">
        <div
          className="h-full bg-blue-400 transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="text-sm text-blue-900 font-semibold">
        {correctCount} / {goalCount}
      </div>
    </div>
  )
}
```

**Step 3: Wire up scene index**

Create `src/scenes/flower/index.tsx`:

```tsx
import type { Scene } from '../types'
import { Flower } from './Flower'
import { Watering } from './Watering'

export const flowerScene: Scene = {
  id: 'flower',
  name: 'Kytka',
  thumbnail: '🌻',
  goalCount: 20,
  Hero: Flower,
  Container: Watering,
}
```

**Step 4: Register scenes**

Create `src/scenes/registry.ts`:

```ts
import type { Scene } from './types'
import { beeScene } from './bee'
import { flowerScene } from './flower'

export const scenes: Scene[] = [beeScene, flowerScene]
export const sceneById = (id: string): Scene =>
  scenes.find(s => s.id === id) ?? beeScene
```

**Step 5: Replace direct `beeScene` imports in App.tsx**

In `src/App.tsx`, replace:

```ts
import { beeScene } from './scenes/bee'
// ...
goalCount={beeScene.goalCount}
scene={beeScene}
```

with:

```ts
import { sceneById } from './scenes/registry'
// in the playing branch:
const scene = sceneById(profile.selectedScene)
// ...
goalCount={scene.goalCount}
scene={scene}
```

Also use `scene` if needed for summary etc.

**Step 6: Run TypeScript and tests**

Run: `npx tsc --noEmit && npm test`
Expected: green.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: second scene 'flower' + scene registry"
```

---

## Task 4: Scene picker on home screen

**Files:**
- Create: `src/ui/ScenePicker.tsx`
- Create: `src/ui/ScenePicker.test.tsx`
- Modify: `src/App.tsx` — show scene picker on home, persist `selectedScene`

**Step 1: Write failing test**

Create `src/ui/ScenePicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScenePicker } from './ScenePicker'
import { scenes } from '../scenes/registry'

describe('ScenePicker', () => {
  it('renders a thumbnail per scene', () => {
    render(<ScenePicker scenes={scenes} selectedId="bee" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: /včelka/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kytka/i })).toBeInTheDocument()
  })

  it('calls onSelect with new id', async () => {
    const onSelect = vi.fn()
    render(<ScenePicker scenes={scenes} selectedId="bee" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /kytka/i }))
    expect(onSelect).toHaveBeenCalledWith('flower')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ScenePicker`
Expected: FAIL.

**Step 3: Implement**

Create `src/ui/ScenePicker.tsx`:

```tsx
import type { Scene } from '../scenes/types'

type Props = {
  scenes: Scene[]
  selectedId: string
  onSelect: (id: string) => void
}

export function ScenePicker({ scenes, selectedId, onSelect }: Props) {
  if (scenes.length <= 1) return null
  return (
    <div className="flex gap-3 justify-center">
      {scenes.map(s => (
        <button
          key={s.id}
          type="button"
          aria-label={s.name}
          onClick={() => onSelect(s.id)}
          className={`text-3xl p-3 rounded-2xl shadow ${
            selectedId === s.id ? 'bg-amber-300 ring-4 ring-amber-500' : 'bg-white hover:bg-amber-100'
          }`}
        >
          {s.thumbnail}
        </button>
      ))}
    </div>
  )
}
```

**Step 4: Wire into App home screen**

In `src/App.tsx`, add to the home screen render:

```tsx
import { ScenePicker } from './ui/ScenePicker'
import { scenes } from './scenes/registry'

// inside home branch JSX, before HRÁT button:
<ScenePicker
  scenes={scenes}
  selectedId={profile.selectedScene}
  onSelect={async (id) => {
    const db = await openDb()
    const updated = { ...profile, selectedScene: id }
    await putProfile(db, updated)
    setProfiles(profiles.map(p => p.id === profile.id ? updated : p))
  }}
/>
```

**Step 5: Run tests and verify**

Run: `npm test`
Expected: green.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: ScenePicker on home screen"
```

---

## Task 5: Decorative "meadow" — items appear with sessions

**Files:**
- Create: `src/ui/Meadow.tsx`
- Create: `src/ui/Meadow.test.tsx`
- Modify: `src/App.tsx` (or SessionScreen) to render Meadow as a backdrop

**Concept:** A horizontal "meadow" strip at the bottom of the home screen. As the profile accumulates completed sessions, small emoji decorations (🌷🌼🍄🦋🐞🌿) deterministically appear. After 1 session: 1 item. After 5: 3 items. After 20: 8 items. Capped at ~12 to avoid clutter.

The function is pure: `decorationsForSessions(count: number): Array<{x: number, emoji: string}>`. Deterministic based on count (uses count as seed) so it's stable across reloads.

**Step 1: Write failing test**

Create `src/ui/Meadow.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { decorationsForSessions } from './Meadow'

describe('decorationsForSessions', () => {
  it('returns 0 for 0 sessions', () => {
    expect(decorationsForSessions(0)).toHaveLength(0)
  })

  it('grows monotonically with sessions', () => {
    const a = decorationsForSessions(5).length
    const b = decorationsForSessions(10).length
    expect(b).toBeGreaterThanOrEqual(a)
  })

  it('caps at ~12', () => {
    expect(decorationsForSessions(1000).length).toBeLessThanOrEqual(12)
  })

  it('is deterministic', () => {
    const a = decorationsForSessions(7)
    const b = decorationsForSessions(7)
    expect(a).toEqual(b)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- Meadow`
Expected: FAIL.

**Step 3: Implement**

Create `src/ui/Meadow.tsx`:

```tsx
const EMOJIS = ['🌷', '🌼', '🍄', '🦋', '🐞', '🌿', '🌾', '🌱']

function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function decorationsForSessions(count: number): Array<{ x: number; emoji: string; size: number }> {
  // Number of decorations: log-ish growth, capped at 12
  const n = Math.min(12, Math.floor(Math.log2(count + 1) * 2.5))
  const rand = mulberry32(42 + n) // stable per "n" — recomputes only when n changes
  const items: Array<{ x: number; emoji: string; size: number }> = []
  for (let i = 0; i < n; i++) {
    items.push({
      x: Math.floor(rand() * 100),
      emoji: EMOJIS[Math.floor(rand() * EMOJIS.length)],
      size: 0.8 + rand() * 0.6,
    })
  }
  return items
}

type Props = { sessionCount: number }

export function Meadow({ sessionCount }: Props) {
  const items = decorationsForSessions(sessionCount)
  return (
    <div className="relative w-full h-16 pointer-events-none select-none" aria-hidden>
      {items.map((it, i) => (
        <span
          key={i}
          style={{ left: `${it.x}%`, fontSize: `${it.size * 1.5}rem` }}
          className="absolute bottom-0"
        >
          {it.emoji}
        </span>
      ))}
    </div>
  )
}
```

**Step 4: Render Meadow in home**

In `src/App.tsx` home branch, just above or below the HRÁT button:

```tsx
import { Meadow } from './ui/Meadow'
// ...
<Meadow sessionCount={(sessionsByProfile[profile.id] ?? []).length} />
```

**Step 5: Run tests**

Run: `npm test`
Expected: green.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: decorative Meadow that grows with sessions"
```

---

## Task 6: Polish pass on visuals

**Files:**
- Modify various as needed

**Background:** Phase 1+2 used quick-and-readable Tailwind defaults. Now is a good time to do a small visual polish before sharing with other parents.

**Step 1: Audit visuals**

Open the app, walk through every screen, look for:
- Inconsistent button heights or paddings
- Missing transitions
- Hard-to-read contrast
- Awkward spacing on small viewports
- Anything that feels "made by a programmer"

**Step 2: Apply fixes**

Examples (apply only what's actually needed):
- Use a custom font (Tailwind's `font-sans` works fine, but consider e.g. Nunito for friendlier look — bundle via `@fontsource/nunito` to keep offline-friendly).
- Add `prefers-reduced-motion` respect: wrap motion components or use `useReducedMotion` from Framer Motion.
- Make sure tap targets are ≥44×44 px (iOS guideline).
- Fix any layout that breaks on iPhone-sized viewports (test with DevTools mobile emulation).

**Step 3: Verify on real device**

If possible, open the dev server URL on a real tablet/phone (use the dev server's network URL). Walk through the flow as a child would.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: phase 3 visual polish"
```

---

## Task 7: Choose host and configure deploy

**Background:** Cloudflare Pages and Vercel both work great for static Vite builds. Pick one. Cloudflare Pages is recommended for free tier and EU-friendly regions; Vercel is recommended for slightly better local dev integration. This plan assumes **Cloudflare Pages**.

**Files:**
- Create: `wrangler.toml` (optional — only if using Wrangler CLI)
- (No source code changes for Pages git-integration deploys)

**Step 1: Create a Cloudflare account (if needed) and connect GitHub repo**

This is a manual step — do it via Cloudflare dashboard. Steps:

1. Go to <https://dash.cloudflare.com> → Pages
2. Connect to GitHub, select the `nasobik` repo
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: 20
4. Deploy

**Step 2: Verify deployed PWA**

Open the assigned `*.pages.dev` URL. Confirm:
- App loads
- Manifest is served (DevTools → Application)
- Service worker registers
- Install button appears in browser address bar
- IndexedDB persists between visits

**Step 3: Optional — custom domain**

If you have a domain (e.g. `nasobik.tritius.cz`), add it in Cloudflare Pages → Custom Domains.

**Step 4: Verify auto-deploy**

Push a small commit to main and confirm Pages rebuilds and redeploys automatically. Stop pushing dummy commits if it works.

**Step 5: Document the URL**

Add to `README.md`:

```md
## Live

<https://nasobik.pages.dev> (Cloudflare Pages, auto-deploys from main)
```

Commit:
```bash
git add README.md
git commit -m "docs: add live URL"
```

---

## Task 8: Acceptance pass

**Step 1: Real-world test by the child**

Have your daughter use the deployed PWA on the device she'll actually use (probably an iPad or Android tablet). Add it to the home screen via the browser's "Add to Home Screen". Open from the home screen icon. Verify:

- [ ] App opens fullscreen (no browser chrome)
- [ ] Profile picker shows
- [ ] Session works exactly as in dev
- [ ] Sounds play
- [ ] Streak increments after session
- [ ] Closing and reopening the app preserves state
- [ ] Going offline mid-session does not break anything (try airplane mode)

**Step 2: Test by another parent**

Send the URL to a friendly parent. Ask them to:
- Add to home screen
- Create a profile for their child
- Have child play a session
- Send back any confusion or bug reports

**Step 3: Triage feedback**

Anything that's a real bug — fix in a small follow-up commit. Anything that's a feature request — note it in `docs/notes/feedback.md` (create if needed) and decide later whether it warrants Phase 4 or YAGNI.

**Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix: <whatever real users tripped over>"
```

---

## Task 9: Final cleanup and ship

**Step 1: Lint, build, test**

Run: `npm run build && npm test`
Expected: green, clean.

**Step 2: Tag a release**

```bash
git tag v1.0.0
git push --tags
```

**Step 3: Celebrate**

It works. Your daughter has a thing. 🐝🌻

---

## After Phase 3

The product is shippable. Possible Phase 4 directions (in priority order, but **only if real use justifies them**):

1. **Replace emoji with hand-drawn SVG** (only if you got feedback that it looks too cheap, and only if you/illustrator can produce one consistent set)
2. **Speed mini-mode** ("Závod včelky") as an opt-in once a child has solid accuracy on all unlocked tables — research-backed but adds complexity and anxiety risk
3. **Sound polish** (more variety, contextual)
4. **Settings screen** for things currently buried (clearing local data, exporting/importing profile JSON)
5. **More scenes** as variety wears off

What this app should NOT become:
- Cloud-synced multi-device (kills "no accounts, no GDPR" simplicity)
- Social / leaderboards (research is clear; resist the temptation)
- A general arithmetic trainer (stay focused on násobilka — separate apps for separate skills)

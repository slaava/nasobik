# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Násobík — a Czech-language gamified multiplication trainer ("malá násobilka" 1×1 … 10×10) for a young child. Local-only PWA-style web app: no accounts, no cloud, all state in IndexedDB. UI strings are Czech.

## Commands

- `npm run dev` — Vite dev server. Bound to `0.0.0.0:5173` and allows the hostnames `slavik-work` and `*.ts.net` so the app is reachable over Tailscale (`http://slavik-work:5173`).
- `npm run build` — `tsc -b && vite build`. The build sets `base: '/nasobik/'` because the site is served from GitHub Pages under `/nasobik/`. Dev keeps `base: '/'`.
- `npm test` — Vitest (single run, jsdom, `src/test/setup.ts` loads `fake-indexeddb` + `@testing-library/jest-dom`).
- `npm run test:watch` — Vitest in watch mode.
- Run a single test file: `npx vitest run src/core/leitner.test.ts`. Filter by name: `npx vitest run -t "fallback"`.
- `npm run lint` — ESLint flat config.
- Typecheck only: `npx tsc --noEmit`.

CI (`.github/workflows/ci.yml`) uses `npm install --no-audit --no-fund`, **not** `npm ci`. The lockfile is generated on macOS and is missing Linux-only optional deps (`@emnapi/*`); `npm ci` fails with EUSAGE. Keep it as `npm install` on Linux unless the lockfile is regenerated there.

If `NODE_ENV=production` leaks into your shell, `npm install` skips devDependencies and Vitest disappears — `unset NODE_ENV` before running tests.

## Architecture

The app is a small state machine over a Leitner spaced-repetition core. Layers, top-down:

- **`src/App.tsx`** — phase machine (`loading | home | playing | summary | parent-gate | parent-settings`). Owns the React-side mirror of profile / cards / sessions. IndexedDB is the source of truth; the app opens a connection per operation and closes it (`db.close()`) — required for `fake-indexeddb` test isolation and harmless in prod.
- **`src/bootstrap.ts`** — on first run creates the single hardcoded profile (`id: 'anicka'`, default name "Emička", unlockedTables `[1, 2, 5, 10]`) and generates its cards. Subsequent runs just load. Multi-profile is plumbed in the types but not surfaced in the UI.
- **`src/core/`** — pure, testable domain:
  - `types.ts` — `Profile`, `Card`, `AnswerEvent`, `Session`.
  - `cards.ts` — `generateCardsForTables(profileId, tables)`. Commutativity is **not** collapsed: `3×7` and `7×3` are distinct cards with independent box state.
  - `leitner.ts` — `applyAnswer` (correct → box+1, wrong → box 1), `bumpExposure`, `pickNext`. Two interval gates:
    - `BOX_EXPOSURE_THRESHOLD` — soft, measured in cards seen *within* the current session.
    - `BOX_SESSION_THRESHOLD` — hard, measured in sessions elapsed since the card was last answered.
    `pickNext` uses a three-tier fallback (ready → session-eligible → any eligible) so the session screen is never stuck on "Načítám…" when no card is fully due — this is load-bearing, do not collapse it.
  - `session.ts` — `useReducer` state machine (`idle | asking | showing-correction | finished`). On `START` it (a) increments `sessionsSinceLastSeen` on **every** card (cards touched this session get reset to 0 by `applyAnswer`; untouched cards keep the bump — this is how Box 3+ items eventually re-surface), and (b) Fisher–Yates shuffles the deck so ties in `pickNext` don't always pick the same card. Includes a "finale" heuristic: when one correct answer remains to reach the goal, prefer a Box 4+ card so the session ends on a confident note.
  - `stats.ts` — `todayStats` / `weekStats` for the parent panel.
- **`src/db/`** — `idb` wrappers. `schema.ts` defines object stores `profiles`, `cards`, `sessions` with a `by-profile` index. `syncCardsToUnlockedTables` reconciles cards when the parent toggles tables; cards on still-unlocked tables are preserved so Leitner progress is not lost.
- **`src/scenes/`** — pluggable "scene" abstraction (`Scene` = `{ Hero, Container, goalCount, ... }`). Only `bee` exists today; `App.tsx` wires it in directly. The Hero/Container components receive `SceneCtx` (`correctCount`, `wrongCount`, `goalCount`, `lastEvent`) and own their own animation.
- **`src/ui/`** — screen components. The bee animates via `framer-motion`'s `useAnimationControls` with explicit chain-back-to-idle, because Framer doesn't re-trigger an animation when the prop value is unchanged across same-result answers.

## Behaviours that bite

- **`SessionScreen` calls `onFinish` exactly once.** It uses a `useRef` guard and depends only on `state.phase`. Adding `state` or `onFinish` to the dep array causes the session to be persisted twice (App re-renders → new closure → effect re-fires before phase flips to `summary`) and stats double-count. If you touch the effect, re-read the comment above the `finishedFiredRef`.
- **No id tiebreak in `pickNext`.** `'10x1'.localeCompare('1x1')` puts multiples of 10 first (digit `0` < letter `x`). Ties are broken by the shuffle done at `START`.
- **IndexedDB connections close before mutations on the same DB elsewhere.** `fake-indexeddb` blocks `deleteDatabase` while a handle is open. App code follows the same pattern in prod.
- **Responsive sizing uses `dvh` and an arbitrary height media query.** Look for `[@media(min-height:760px)]:` modifiers — they exist because some short phones rendered the question over the score. Keep that pattern when touching layout.
- **Vite `base`.** Dev `/`, build `/nasobik/`. If you add image imports, use Vite asset imports (`import url from './x.svg'`) so the base prefix is applied; don't hardcode `/assets/...` paths.

## Deployment

Push to `main` triggers the CI workflow, which builds and deploys `dist/` to GitHub Pages → https://slaava.github.io/nasobik/. The repo is public to fit the free Pages tier — audit anything sensitive before committing. `.env` (containing the Recraft API key used once to generate the bee SVG) is gitignored.

## Git identity

The repo has a local `user.email` set to the `slaava` GitHub no-reply address. Never override the commit author with `-c user.email=...` in this repo — see `~/.claude/projects/-Users-slavik-work-nasobik/memory/nasobik_git_identity.md`.

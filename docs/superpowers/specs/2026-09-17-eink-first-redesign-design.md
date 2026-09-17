# Násobík redesign: e-ink first, cat companion

Date: 2026-09-17. Status: approved by the user after a visual brainstorming session
(mockups in `.superpowers/brainstorm/27729-1789672813/content/`, not committed).

## Goal

Replace the bee theme (tied to a past school year) with a neutral, long-lived design
that renders well on e-ink readers and on the old WebKit browsers they ship, while the
colour version on a phone stays pleasant. One design, two renders.

## Decisions taken

| Question | Decision |
|---|---|
| Theme | Fixed theme, neutral mascot: a cat. |
| Mascot role | Companion only. Comments in a speech bubble, no game mechanic, no persisted state. |
| Visual style | "School notebook": white paper, thin outlines, no shadows, no gradients. |
| Progress | Dots instead of `x / y` numbers (session: 20 dots; home: per-game mastery dots). |
| Cat head | Wide flat head, small dot eyes far apart, whiskers (variant "A" from the mockups). |
| Colour palette | Mint: paper `#f2f8f4`, ink `#1f3a34`, card `#fff`, accent `#2f9e78`, muted `#cfe3da`, fur `#d9d5cf`, nose `#e07a8c`. |
| Home layout | Cat greeting in a bubble, games as rows with mastery dots, small "today" summary at the bottom. |

## 1. One design, two renders

- Tokens live as CSS custom properties on `:root` (`--paper`, `--ink`, `--card`, `--accent`,
  `--accent-fg`, `--muted`, `--fur`, `--nose`). `[data-theme="eink"]` overrides them to pure
  black/white and disables transitions. The existing `src/eink.ts` (URL `?eink=1|0`,
  localStorage, parent-settings checkbox) stays as the switch.
- Tailwind stays. The amber utility classes are replaced by semantic colours registered in
  `tailwind.config.js` that map to the variables (`bg-paper`, `text-ink`, `border-ink`,
  `bg-card`, `bg-accent`, `text-accent-fg`, `text-muted`). The current per-class override
  block in `src/index.css` is deleted once no component uses amber classes.
- Shape carries meaning; colour is additive. Every state must be readable with ink on paper
  only: borders, filled vs outlined dots, filled accent button, text.

## 2. No animation dependency

- `framer-motion` is removed from the project.
- Colour render may use short CSS transitions (`transition: background-color, transform`
  ≤ 150 ms) on buttons and the bubble. E-ink render sets `transition: none` globally.
- Answer feedback is identical in both renders: the cat swaps to one of three static
  expressions and the bubble text changes. No movement is required to understand the state.

## 3. The cat companion

- `src/scenes/cat/CatHead.tsx`: one inline SVG (viewBox 120×100) drawn in code, prop
  `mood: 'neutral' | 'happy' | 'surprised'`. Fill uses `var(--fur)`, strokes `var(--ink)`,
  nose `var(--nose)`. Stroke widths 2.6 / 1.8 so the outline survives 1-bit rendering.
- `src/scenes/cat/phrases.ts`: Czech phrase lists keyed by event:
  `greeting`, `correct`, `streak` (3+ correct in a row), `wrong`, `dunno` ("Já nevím"),
  `finish-good`, `finish-mixed`. Selection is deterministic:
  `phrases[event][answersCount % phrases[event].length]`, so re-renders never reshuffle.
  Phrases use the child's name where natural ("Ahoj, {name}!").
- Mood mapping: idle/greeting → neutral, correct/streak/finish-good → happy,
  wrong/dunno → surprised.
- The `Scene` abstraction (`src/scenes/types.ts`) is kept; `catScene` replaces `beeScene`
  with `Hero` = cat head + bubble and `Container` = session dots. `SceneCtx` gains
  `streak: number` and `phraseSeed: number` (answers count) so the scene stays pure.

## 4. Screens

**Home**
- Gear icon top right (full opacity, no 40% variant).
- Cat head (≈ 30% of width) with bubble: greeting phrase.
- One row per enabled game: glyph, name, mastery dots on the right. 10 dots; filled count =
  `round(10 × mastered / total)` where mastered = cards of that game in Box ≥ 3. Arith mode
  has no fixed deck: its row shows dots for the *mistake queue* inverted
  (all filled when the queue is empty), with a short label "bez chyb" when empty.
- Footer line: "Dnes: {sessions} her · {correct} správně" from `todayStats`.

**Session**
- Header: game name left, 20 session dots right (filled = correct answers so far). No
  `x / y` numbers.
- Cat head + bubble under the header. Clock games keep the clock face beside them, as today.
- Question, answer field as a bottom-underlined number in accent colour, numpad with 1.5 px
  ink borders and rounded corners; ✓ is the only filled (accent) key; ⌫ uses `--muted`.
- "Já nevím" stays as an underlined text link.

**Summary**
- Happy cat, phrase from `finish-good`/`finish-mixed`, two result lines, two buttons
  (filled accent "Hrát znovu", outlined "Hotovo").

**Parent settings, gate, heatmap**
- Recolour to tokens only. Heatmap becomes a 5-step grey ramp (`#fff` outlined → `#000`)
  in both renders; the colour render may tint the ramp with the accent hue but must keep the
  same lightness steps.

## 5. Old-browser compatibility (Kindle-class WebKit)

- Keep `@vitejs/plugin-legacy` and the vh fallbacks. Add `src/compat.test.ts` that scans
  `src/**/*.tsx` and fails on any `dvh` utility not listed in the fallback block of
  `src/index.css`, and on any `aspect-ratio`, `inset-`, `gap-` used on a flex container
  (grid `gap` is fine). Flex spacing uses margins.
- Layout: flex + grid only. Heights via `vh` with `dvh` as progressive enhancement.
- SVG: plain paths, `transform` attributes, no filters, no `<use href>` across files
  (inline everything into the component).
- No CSS `:has()`, no container queries, no `color-mix()`.

## Testing

- Unit: `phrases.ts` (deterministic pick, all events non-empty), `CatHead` renders one
  `<svg>` per mood with the expected `data-mood`, mastery-dot maths, `compat.test.ts`.
- Component: `SessionScreen` shows 20 dots and updates filled count; home lists rows for
  enabled games with correct dot counts; the eink checkbox still toggles `data-theme`.
- Existing session/Leitner/db tests unchanged.
- Manual: deploy, open `?eink=1` on the Kindle Paperwhite, check home, tables, clock,
  summary; then the colour render on the phone.

## Out of scope

- Multiple selectable scenes, mascot growth or rewards, sound, new games.
- Kiosk lock-down of the target device (separate task).

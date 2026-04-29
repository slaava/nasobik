# Násobík — design

**Datum:** 2026-04-29
**Autor:** Slavik (s podporou Claude)

## Cíl

Lokální webová aplikace pro trénování malé násobilky (1-10) pro děti druhé třídy. Inspirovaná školní hrou „krmení včelky" — dítě odpovídá na příklady a tím nakrmí včelku. Postaveno na výzkumu efektivního učení a motivace pro věk 7-8 let.

## Klíčová rozhodnutí

| Oblast | Volba | Zdůvodnění |
|---|---|---|
| Platforma | Webová aplikace, React + TS + Vite + Tailwind, IndexedDB, později PWA | Bez instalace, snadná distribuce dalším rodičům |
| Účty | Lokální multi-profil bez přihlášení | Žádné GDPR starosti, dítě si vybere profil jako na Netflixu |
| Odemykání řad | Ručně rodičem | Synchronizace s tempem školy, jednoduché |
| Vstup | Typed (on-screen numpad + klávesnice) | Žádné multiple choice → žádné tipování |
| Metafora | Animovaná včelka, postupně rozšiřitelná o další scény | Kontinuita se školou + variabilita do budoucna |
| Délka sezení | Goal-based (~20 správných odpovědí) | Cepeda 2006, Rohrer & Taylor — 5-10 min optimum pro 7-8 let |
| SRS | Vlastní Leitner s 5 boxy a intervaly v počtech příkladů, ne v dnech | van Rijn 2009 — Anki intervaly nejsou pro malé děti |
| Časomíra | Žádná viditelná, RT měřen jen interně pro fluency | Boaler 2014 — viditelná časomíra způsobuje matematickou úzkost |
| Chybné odpovědi | Neutrální signál → ukázat správnou → dítě opíše → vrátit za ~3 příklady | Metcalfe 2017, VanLehn 2006 |
| Odměny | Narativní (med, plnící úl), proměnlivé malé odměny | SDT (Deci & Ryan), Habgood & Ainsworth 2011 — intrinsic integration |
| Streak | Měkký, 1 free day/týden | Aby streak nebyl stresorem |
| Komutativita | 3×7 a 7×3 jako 2 samostatné karty | Baroody 1999 — děti nepřenášejí samy |
| Žebříčky | Žádné | Hanus & Fox 2015 |
| Rodičovský pohled | Heatmapa zvládání + checkboxy řad + smazat profil | Minimal viable, žádné notifikace ani trendy |

## Architektura

### Tech stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Animace:** Framer Motion
- **Storage:** IndexedDB přes `idb`
- **Backend:** žádný — vše lokálně v prohlížeči
- **Hostování:** Cloudflare Pages / Vercel jako statický web (později)
- **PWA:** vite-plugin-pwa, přidáno ve fázi 3

### Datový model

```ts
type Profile = {
  id: string
  name: string
  avatar: string
  createdAt: number
  unlockedTables: number[]
  selectedScene: string
  streak: { current: number, lastPlayedDate: string, freeDayUsedThisWeek: boolean }
}

type Card = {
  id: string                  // `${profileId}:${a}x${b}`
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

type Session = {
  id: string
  profileId: string
  startedAt: number
  endedAt: number | null
  answers: Array<{ a: number, b: number, correct: boolean, rt: number }>
}
```

### SRS algoritmus (Leitner, kid-tuned)

5 boxů, intervaly měřené v počtech zobrazených příkladů (ne v čase):

- **Box 1** — vrátí se po 3 dalších odpovědích v sezení
- **Box 2** — vrátí se po ~10 dalších odpovědích v sezení
- **Box 3** — vrátí se v dalším sezení
- **Box 4** — vrátí se za 2-3 sezení
- **Box 5** — udržovačka, jen pro karty s RT < 3 s

**Posuny:**
- Správně → +1 box (max 5)
- Špatně → propad do Box 1
- Cíl: udržet úspěšnost ~85% (Burns 2010)

**Výběr otázky:** priorita podle (box, exposuresSinceLastSeen). Boxy 1-2 přednostně. Po nově odemčené řadě prvních ~15 otázek blokovaně z té řady, pak interleaving.

**Konec sezení:** poslední otázka je z Box 4-5 (jistě umí) → ukončení na úspěchu.

### Scénový systém

```ts
type Scene = {
  id: string
  name: string
  thumbnail: string
  goalCount: number
  Hero: React.FC<SceneCtx>
  Container: React.FC<SceneCtx>
  CorrectFx: React.FC<SceneCtx>
  WrongFx: React.FC<SceneCtx>
  IdleAnim?: React.FC<SceneCtx>
  rewardSound?: string
}
```

V MVP jen scéna `bee`. Architektura je připravená na další.

## UX flow

### Vstupní obrazovka
- Velké ikony profilů, výběr profilu
- "+ nový profil"
- Skrytá brána do rodičovského pohledu (matematická úloha typu „47 + 28")

### Domovská obrazovka profilu
- Animovaná emoji včelka uprostřed
- Streak indikátor (měkký)
- Tlačítko HRÁT
- "Co umím" → heatmapa pro dítě (barevné políčka, žádná čísla)

### Sezení
- Velký výraz `3 × 7 = ?`
- On-screen numpad + klávesnice (Enter potvrzuje)
- Tlačítko „Já nevím" (autonomy)
- Vizualizace plnícího se úlu vlevo nahoře
- Při správné: kapka medu padá k úlu, občas dvě (variable reward)
- Při chybné: jemný shake, ukázat správnou odpověď, dítě ji opíše

### Konec sezení
- Spokojená včelka, krátké shrnutí v laskavém jazyce
- Tlačítka HRÁT ZNOVU / HOTOVO
- Občas drobnost přidaná na louku (intrinsic decoration)

### Rodičovský pohled
- Checkboxy řad 1-10 → odemykání
- Heatmapa 10×10 obarvená podle Leitner boxu
- Souhrn (dnes, tento týden)
- Smazat profil

## Vývojové fáze

### Fáze 1 — MVP
- Vite + React + TS + Tailwind setup
- IndexedDB schéma + `idb` wrapper
- Jeden hard-coded profil
- Leitner algoritmus + unit testy
- Sezení s numpad
- Animovaná emoji včelka
- Konec sezení s shrnutím

### Fáze 2 — Použitelné
- Výběr a vytvoření profilu (multi-profile)
- Rodičovský pohled (math gate, checkboxy, heatmapa)
- Streak s free day
- „Co umím" pohled pro dítě
- Smazat profil
- Mute toggle

### Fáze 3 — Distribuce
- PWA
- Druhá scéna jako důkaz rozšiřitelnosti
- Případný upgrade grafiky z emoji na ručně dělané SVG
- Hostování + URL

## Co NENÍ v plánu (YAGNI)

- Cloud sync, účty
- Žebříčky, sociální funkce
- Měření přes čas v UI dítěte
- Speed mode (jen volitelně později jako oddělený mini-režim)
- Dělení / sčítání / odčítání
- Profesionální 2D animace
- Notifikace pro rodiče
- Editace Leitner stavu rodičem

## Klíčové reference

- Cepeda, Pashler, Vul, Wixted & Rohrer (2006) — meta-analýza spaced practice
- Burns, Codding, Boice & Lukito (2010) — incremental rehearsal, 85% target
- van Rijn et al / SlimStampen (2009) — adaptive fact learning pro děti
- Metcalfe (2017) — learning from errors
- VanLehn (2006) — try-again then show
- Boaler (2014) — Fluency Without Fear, math anxiety a časomíra
- Deci & Ryan (1985, 2000) — Self-Determination Theory
- Hanus & Fox (2015) — gamification a intrinsic motivation
- Habgood & Ainsworth (2011) — intrinsic integration odměn
- Rohrer & Taylor (2007) — interleaved vs blocked practice
- Baroody (1999, 2006) — komutativita a missing-factor problémy
- Pekrun (2006) — Control-Value Theory anxiety

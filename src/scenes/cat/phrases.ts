// src/scenes/cat/phrases.ts
export type CatEvent = 'greeting' | 'start' | 'correct' | 'streak' | 'wrong' | 'dunno' | 'finish-good' | 'finish-mixed'
export type CatMood = 'neutral' | 'happy' | 'surprised'

// Czech, child-facing, short enough for a one-line bubble on a 6" screen.
// `{name}` is replaced by the child's name and is allowed ONLY in `greeting`
// (the home screen is the one caller that knows the name). Keep every list long enough that a
// 20-question session does not repeat itself for the frequent events.
export const PHRASES: Record<CatEvent, readonly string[]> = {
  greeting: [
    'Ahoj, {name}! Co dneska?',
    'Ahoj, {name}! Jdeme na to?',
    'Ahoj, {name}! Jednu hru?',
    'Ahoj, {name}! Mám chuť… na počítání!',
    'Ahoj, {name}! Už jsem se těšila.',
    'Ahoj, {name}! Vyber si hru.',
    'Ahoj, {name}! Dnes to bude hračka.',
    'Ahoj, {name}! Já už mám tlapky nachystané.',
  ],
  start: [
    'Tak jdeme na to!',
    'Držím ti tlapky.',
    'Beze spěchu, v klidu.',
    'První příklad, hop!',
    'Dneska to dáme.',
    'Já ti věřím.',
    'Klidně si to říkej nahlas.',
    'Soustředění… a start!',
    'Jedeme na to!',
    'Ukaž, co umíš.',
    'Každý příklad se počítá.',
    'Pěkně jeden po druhém.',
  ],
  correct: [
    'Přesně tak!',
    'Jo, to je ono.',
    'Správně!',
    'Mňau, dobrý.',
    'Tu už znáš.',
    'Šlo ti to rychle!',
    'Trefa.',
    'Ano! Další.',
    'To bylo hračka, co?',
    'Vidíš, umíš to.',
    'Paráda.',
    'Tak tak.',
    'Skvěle, jedeme dál.',
    'Bez zaváhání!',
    'Jo jo jo.',
    'Tohle sedlo.',
    'Hlava ti šlape.',
    'Krása.',
    'Dobře ty!',
    'Máš to v malíku.',
  ],
  streak: [
    'Tři v řadě!',
    'Jedeš jak drak.',
    'Nezastavitelná!',
    'Tohle ti jde.',
    'Série roste!',
    'Ani jedna chyba, wow.',
    'Ty jsi dneska stroj.',
    'Držíš tempo!',
    'Už to jede samo.',
    'Já se jen dívám a divím.',
    'Takhle dál!',
    'Mistrovská jízda.',
  ],
  wrong: [
    'Hm, skoro. Zkus to napsat.',
    'Nevadí, příště to bude.',
    'Mrkni, jak to je, a napiš to.',
    'To se stane i mně.',
    'Omyl je kámoš učení.',
    'Ještě jednou, v klidu.',
    'Tuhle si zapíšeme za uši.',
    'Tak tady ještě zabojujeme.',
    'Malý zádrhel, nic víc.',
    'Napiš to správně a jedeme dál.',
    'Příště už to trefíš.',
    'Za chvíli se to vrátí, uvidíš.',
  ],
  dunno: [
    'Dobře, ukážu ti to.',
    'Podívej, takhle.',
    'Tak si to zapamatujeme.',
    'Nevědět je v pořádku. Tady je to.',
    'Koukni a napiš to po mně.',
    'Tuhle si spolu zopakujeme.',
    'Mrk, tady je odpověď.',
    'Napiš to a už si to budeš pamatovat.',
  ],
  'finish-good': [
    'Hotovo! Paráda.',
    'To bylo krásné počítání.',
    'Mňau! Zvládnuto.',
    'Dneska skvěle.',
    'Hotovo, můžeš být pyšná.',
    'To šlo jako po másle.',
    'Hotovo! Já jdu spát, ty si hraj.',
    'Bezva hra. Zítra zas?',
    'Výborně, jsi jednička!',
    'Takhle se to dělá.',
  ],
  'finish-mixed': [
    'Hotovo. Pár věcí si ještě zopakujeme.',
    'Dobrá práce, něco ještě doladíme.',
    'Zvládnuto, ty těžší se vrátí.',
    'Hotovo! Ty záludné příště dáme.',
    'Dobré. Pár příkladů si ještě pohlídáme.',
    'Konec, a bylo to fajn. Něco ještě potrénujeme.',
    'Hotovo. Zbytek doženeme.',
    'Snaha byla vidět. Příště o krok dál.',
  ],
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

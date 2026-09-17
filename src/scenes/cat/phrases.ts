// src/scenes/cat/phrases.ts
export type CatEvent = 'greeting' | 'correct' | 'streak' | 'wrong' | 'dunno' | 'finish-good' | 'finish-mixed'
export type CatMood = 'neutral' | 'happy' | 'surprised'

// Czech, child-facing. `{name}` is replaced by the child's name.
export const PHRASES: Record<CatEvent, readonly string[]> = {
  greeting: ['Ahoj, {name}! Co dneska?', 'Ahoj, {name}! Jdeme na to?', 'Ahoj! Jednu hru?', 'Ahoj, {name}! Mám chuť… na počítání!'],
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

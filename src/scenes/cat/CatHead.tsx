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

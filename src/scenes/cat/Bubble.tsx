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

// src/ui/ProgressDots.tsx
type Props = { total: number; filled: number; label?: string; className?: string; size?: 'sm' | 'md' }

// Filled = solid disc, empty = ring. Never rely on lightness: e-ink maps --muted to black.
export function ProgressDots({ total, filled, label, className, size = 'md' }: Props) {
  const dot = size === 'sm' ? 'w-1.5 h-1.5 mr-0.5' : 'w-2 h-2 mr-1'
  const n = Math.max(0, Math.min(total, Math.round(filled)))
  return (
    <span role="img" aria-label={label ? `${label}: ${n} z ${total}` : `${n} z ${total}`} className={`inline-flex ${className ?? ''}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-dot={i < n ? 'on' : 'off'}
          className={`inline-block ${dot} rounded-full border-[1.5px] last:mr-0 ${i < n ? 'bg-accent border-accent' : 'bg-transparent border-muted'}`}
        />
      ))}
    </span>
  )
}

import { formatTime } from '../core/clock'

export function ClockFace({ hour, minute, showMinuteRing = false, className }: {
  hour: number
  minute: number
  showMinuteRing?: boolean
  className?: string
}) {
  const radius = showMinuteRing ? 80 : 96
  const numeralRadius = showMinuteRing ? 60 : 74
  const ringRadius = 106
  const point = (angle: number, r: number) => ({
    x: 100 + Math.sin(angle * Math.PI / 180) * r,
    y: 100 - Math.cos(angle * Math.PI / 180) * r,
  })
  return (
    // The minute ring sits outside the face circle, so widen the viewBox instead
    // of relying on overflow — parents with overflow-hidden would clip "60".
    <svg viewBox={showMinuteRing ? '-14 -14 228 228' : '0 0 200 200'} role="img" aria-label={`hodiny ${formatTime(hour * 100 + minute)}`} data-testid="clock-face" data-hour={hour} data-minute={minute} className={className}>
      <circle cx="100" cy="100" r={radius} fill="var(--card)" stroke="var(--ink)" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="100" y1={100 - radius + 4} x2="100" y2={100 - radius + (i % 5 === 0 ? 13 : 8)} stroke="var(--ink)" strokeWidth={i % 5 === 0 ? 3 : 1} transform={`rotate(${i * 6} 100 100)`} />
      ))}
      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
        <text key={n} {...point(n * 30, numeralRadius)} fontSize="20" fontWeight="bold" fill="var(--ink)" textAnchor="middle" dominantBaseline="central">{n}</text>
      ))}
      {showMinuteRing && Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
        <text key={n} {...point(n * 30, ringRadius)} fontSize="11" fill="var(--accent)" textAnchor="middle" dominantBaseline="central">{n * 5}</text>
      ))}
      <line x1="100" y1="100" x2="100" y2="52" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" transform={`rotate(${(hour % 12) * 30 + minute * 0.5} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2={100 - radius + 8} stroke="var(--minute-hand)" strokeWidth="5" strokeLinecap="round" transform={`rotate(${minute * 6} 100 100)`} />
      <circle cx="100" cy="100" r="5" fill="var(--ink)" />
    </svg>
  )
}

export function DigitalDisplay({ value, className }: { value: number; className?: string }) {
  return <div data-testid="digital-display" className={`rounded-2xl bg-ink text-paper font-mono tabular-nums px-5 py-2 ${className ?? ''}`}>{formatTime(value)}</div>
}

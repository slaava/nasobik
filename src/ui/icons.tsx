// Inline SVG icons. Emoji and many Unicode symbols (⚙️ 🕒 ⌫ ✓ ☀️ 🌙) are
// missing from the fonts of e-ink readers' browsers and render as blank boxes,
// so every pictogram in the UI is drawn here with currentColor strokes.
type IconProps = { className?: string; title?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Svg({ className, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg {...base} className={className ?? 'inline-block w-6 h-6'} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {children}
    </svg>
  )
}

export function GearIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </Svg>
  )
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Svg>
  )
}

export function SunIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </Svg>
  )
}

export function MoonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </Svg>
  )
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  )
}

export function BackspaceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 5h11a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-11L2.5 12z" />
      <path d="M11 9.5l5 5M16 9.5l-5 5" />
    </Svg>
  )
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 11.5L12 4l8.5 7.5" />
      <path d="M5.5 10v10h13V10" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  )
}

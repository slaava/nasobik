type Props = {
  onDigit: (d: number) => void
  onClear: () => void
  onSubmit: () => void
}

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Numpad({ onDigit, onClear, onSubmit }: Props) {
  const digitClass =
    'rounded-xl border-[1.5px] border-ink bg-card py-2 [@media(min-height:760px)]:py-3 lg:py-6 text-xl [@media(min-height:760px)]:text-2xl lg:text-3xl font-bold text-ink active:scale-95'
  const utilClass =
    'rounded-xl py-2 [@media(min-height:760px)]:py-3 lg:py-6 text-base [@media(min-height:760px)]:text-lg lg:text-xl font-semibold border-[1.5px] active:scale-95'
  return (
    <div className="grid grid-cols-3 gap-1.5 [@media(min-height:760px)]:gap-2 lg:gap-3 max-w-sm w-full mx-auto">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onDigit(k)}
          className={digitClass}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className={`${utilClass} bg-card border-ink text-ink`}
        aria-label="Smazat"
      >
        ⌫
      </button>
      <button
        type="button"
        onClick={() => onDigit(0)}
        className={digitClass}
      >
        0
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className={`${utilClass} bg-accent text-accent-fg border-accent`}
        aria-label="Hotovo"
      >
        ✓
      </button>
    </div>
  )
}

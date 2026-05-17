type Props = {
  onDigit: (d: number) => void
  onClear: () => void
  onSubmit: () => void
}

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Numpad({ onDigit, onClear, onSubmit }: Props) {
  const digitClass =
    'rounded-2xl bg-white shadow-md py-2 [@media(min-height:760px)]:py-3 lg:py-6 text-xl [@media(min-height:760px)]:text-2xl lg:text-3xl font-bold text-amber-900 active:scale-95 transition'
  const utilClass =
    'rounded-2xl shadow-md py-2 [@media(min-height:760px)]:py-3 lg:py-6 text-base [@media(min-height:760px)]:text-lg lg:text-xl font-semibold text-amber-900 active:scale-95 transition'
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
        className={`${utilClass} bg-amber-100`}
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
        className={`${utilClass} bg-amber-500 text-white`}
        aria-label="Hotovo"
      >
        ✓
      </button>
    </div>
  )
}

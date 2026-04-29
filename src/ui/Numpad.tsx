type Props = {
  onDigit: (d: number) => void
  onClear: () => void
  onSubmit: () => void
}

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Numpad({ onDigit, onClear, onSubmit }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm w-full mx-auto">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onDigit(k)}
          className="rounded-2xl bg-white shadow-md py-6 text-3xl font-bold text-amber-900 active:scale-95 transition"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="rounded-2xl bg-amber-100 shadow-md py-6 text-xl font-semibold text-amber-900 active:scale-95 transition"
        aria-label="Smazat"
      >
        ⌫
      </button>
      <button
        type="button"
        onClick={() => onDigit(0)}
        className="rounded-2xl bg-white shadow-md py-6 text-3xl font-bold text-amber-900 active:scale-95 transition"
      >
        0
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className="rounded-2xl bg-amber-500 shadow-md py-6 text-xl font-bold text-white active:scale-95 transition"
        aria-label="Hotovo"
      >
        ✓
      </button>
    </div>
  )
}

type Props = {
  unlockedTables: number[]
  onToggleTable: (n: number) => void
  onBack: () => void
}

export function ParentSettings({ unlockedTables, onToggleTable, onBack }: Props) {
  const unlocked = new Set(unlockedTables)
  return (
    <div className="flex flex-col h-full bg-amber-50 p-6 gap-6 overflow-y-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-900">Pro rodiče</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-amber-700 underline text-base"
        >
          Zpět
        </button>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Řady násobilky</h2>
        <p className="text-sm text-amber-700 mb-4">
          Zaškrtni jen ty řady, které právě probírá ve škole.
        </p>
        <div className="grid grid-cols-5 gap-3 max-w-2xl">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const on = unlocked.has(n)
            return (
              <label
                key={n}
                className={`flex items-center justify-center gap-2 rounded-2xl p-4 shadow cursor-pointer select-none transition ${
                  on ? 'bg-amber-300' : 'bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`Řada ${n}`}
                  checked={on}
                  onChange={() => onToggleTable(n)}
                  className="w-5 h-5"
                />
                <span className="text-2xl font-bold text-amber-900 tabular-nums">{n}×</span>
              </label>
            )
          })}
        </div>
      </section>

      <p className="text-xs text-amber-600 max-w-md">
        Pokrok v jednotlivých řadách zůstává zachovaný — když řadu vypneš a později
        znovu zapneš, dítě naváže tam, kde skončilo.
      </p>
    </div>
  )
}

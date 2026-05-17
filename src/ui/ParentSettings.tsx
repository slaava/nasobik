import { useEffect, useState } from 'react'
import type { Card, Session } from '../core/types'
import { todayStats, weekStats } from '../core/stats'
import { Heatmap } from './Heatmap'

type Props = {
  name: string
  unlockedTables: number[]
  cards: Card[]
  sessions: Session[]
  onRename: (newName: string) => void
  onToggleTable: (n: number) => void
  onBack: () => void
}

export function ParentSettings({
  name,
  unlockedTables,
  cards,
  sessions,
  onRename,
  onToggleTable,
  onBack,
}: Props) {
  const [nameDraft, setNameDraft] = useState(name)
  useEffect(() => setNameDraft(name), [name])

  const unlocked = new Set(unlockedTables)
  const today = todayStats(sessions)
  const week = weekStats(sessions)

  const commitName = () => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    else setNameDraft(name)
  }

  return (
    <div className="flex flex-col h-full bg-amber-50 p-6 gap-6 overflow-y-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-amber-900">Pro rodiče</h1>
        <button type="button" onClick={onBack} className="text-amber-700 underline text-base">
          Zpět
        </button>
      </header>

      <section className="space-y-2">
        <label htmlFor="child-name" className="block text-xl font-semibold text-amber-900">
          Jméno dítěte
        </label>
        <input
          id="child-name"
          type="text"
          value={nameDraft}
          onChange={e => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          maxLength={20}
          className="rounded-2xl bg-white px-5 py-3 text-xl shadow w-full max-w-sm text-amber-900"
        />
      </section>

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
        <p className="text-xs text-amber-600 mt-2 max-w-md">
          Pokrok zůstává — vypnutou řadu po zapnutí navážeš tam, kde dítě skončilo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Co umí</h2>
        <p className="text-sm text-amber-700 mb-3">
          Barevná mapa po jednotlivých příkladech. Červeně se teprve učí, zeleně už umí.
        </p>
        <Heatmap cards={cards} />
        <div className="flex gap-3 mt-3 text-xs text-amber-700 flex-wrap">
          <Legend label="učí se" className="bg-red-300" />
          <Legend label="zlepšuje se" className="bg-orange-300" />
          <Legend label="ví" className="bg-yellow-300" />
          <Legend label="umí" className="bg-lime-400" />
          <Legend label="automaticky" className="bg-green-600" />
          <Legend label="zamčená řada" className="bg-gray-200" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Statistiky</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <StatCard
            title="Dnes"
            lines={[
              `${today.questions} ${pluralize(today.questions, 'příklad', 'příklady', 'příkladů')}`,
              today.questions > 0
                ? `${today.correctPct}% správně`
                : 'zatím nehrálo',
              today.minutes > 0
                ? `${today.minutes} ${pluralize(today.minutes, 'minuta', 'minuty', 'minut')}`
                : '',
            ]}
          />
          <StatCard
            title="Tento týden"
            lines={[
              `${week.sessions} ${pluralize(week.sessions, 'sezení', 'sezení', 'sezení')}`,
              `${week.questions} ${pluralize(week.questions, 'příklad', 'příklady', 'příkladů')}`,
              week.minutes > 0
                ? `${week.minutes} ${pluralize(week.minutes, 'minuta', 'minuty', 'minut')}`
                : '',
            ]}
          />
        </div>
      </section>
    </div>
  )
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-3 h-3 rounded ${className}`} />
      {label}
    </span>
  )
}

function StatCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <div className="text-amber-800 font-semibold mb-1">{title}</div>
      <ul className="text-amber-900 space-y-0.5">
        {lines.filter(Boolean).map((line, i) => (
          <li key={i} className="tabular-nums">{line}</li>
        ))}
      </ul>
    </div>
  )
}

function pluralize(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  if (n >= 2 && n <= 4) return few
  return many
}

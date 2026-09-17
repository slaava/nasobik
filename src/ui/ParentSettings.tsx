import { CLOCK_LEVELS, CLOCK_LEVEL_LABELS, cardsForClockLevel, clockLevelOf, isClockOp } from '../core/clock'
import { useEffect, useState } from 'react'
import type { Card, Session, ClockLevel } from '../core/types'
import { todayStats, weekStats } from '../core/stats'
import { formatQuestion, isArithOp } from '../core/cards'
import { Heatmap } from './Heatmap'

type Props = {
  name: string
  unlockedTables: number[]
  divisionEnabled: boolean
  clockEnabled: boolean
  clockLevels: ClockLevel[]
  onToggleClock: () => void
  onToggleClockLevel: (level: ClockLevel) => void
  arithEnabled: boolean
  onToggleArith: () => void
  cards: Card[]
  sessions: Session[]
  onRename: (newName: string) => void
  onToggleTable: (n: number) => void
  onToggleDivision: () => void
  onBack: () => void
}

export function ParentSettings({
  name,
  unlockedTables,
  divisionEnabled,
  arithEnabled,
  onToggleArith,
  clockEnabled,
  clockLevels,
  onToggleClock,
  onToggleClockLevel,
  cards,
  sessions,
  onRename,
  onToggleTable,
  onToggleDivision,
  onBack,
}: Props) {
  const [nameDraft, setNameDraft] = useState(name)
  // Keep the editable draft synchronized with the persisted name supplied by App.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNameDraft(name), [name])

  const unlocked = new Set(unlockedTables)
  const arithCards = cards.filter(c => isArithOp(c.op))
    .sort((a, b) => a.box - b.box || a.id.localeCompare(b.id))
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
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Operace</h2>
        <div className="flex flex-col gap-3 items-start">
          <label className="inline-flex items-center gap-3 rounded-2xl bg-white shadow px-4 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={divisionEnabled}
              onChange={onToggleDivision}
              className="w-5 h-5"
            />
            <span className="text-lg text-amber-900">Procvičovat i dělení</span>
          </label>
          <p className="text-xs text-amber-600 mt-2 max-w-md">
            Ke každému příkladu typu <span className="tabular-nums">6 × 7</span> přidá i opačný{' '}
            <span className="tabular-nums">42 ÷ 6</span>. Pokrok pro každý směr je samostatný.
          </p>
          <label className="inline-flex items-center gap-3 rounded-2xl bg-white shadow px-4 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={arithEnabled}
              onChange={onToggleArith}
              className="w-5 h-5"
            />
            <span className="text-lg text-amber-900">Sčítání a odčítání do 100</span>
          </label>
          <p className="text-xs text-amber-600 mt-2 max-w-md">
            Přidá na úvodní obrazovku druhou hru. Příklady jsou náhodné do 100, chybné se vrací, dokud je dítě neumí.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Hodiny</h2>
        <label className="inline-flex items-center gap-3 rounded-2xl bg-white shadow px-4 py-3 cursor-pointer select-none">
          <input type="checkbox" checked={clockEnabled} onChange={onToggleClock} className="w-5 h-5" />
          <span className="text-lg text-amber-900">Poznávání hodin</span>
        </label>
        <p className="text-xs text-amber-600 mt-2 max-w-md">Třetí hra na úvodní obrazovce. Úrovně odemykej postupně podle toho, co dítě zvládá.</p>
        <div className="flex flex-col gap-2 max-w-md mt-3">
          {CLOCK_LEVELS.map(level => {
            const label = CLOCK_LEVEL_LABELS[level]
            const mastered = cards.filter(c => isClockOp(c.op) && clockLevelOf(c) === level && c.box >= 4).length
            const total = cardsForClockLevel('', level).length
            return (
              <label key={level} className={`flex items-center gap-2 rounded-2xl p-3 shadow cursor-pointer ${clockLevels.includes(level) ? 'bg-amber-300' : 'bg-white'}`}>
                <input type="checkbox" aria-label={`Úroveň ${label}`} checked={clockLevels.includes(level)} onChange={() => onToggleClockLevel(level)} className="w-5 h-5" />
                <span className="text-amber-900">{label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-sm text-amber-700">{mastered} / {total} umí</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-amber-600 mt-2 max-w-md">Pokrok zůstává — vypnutou úroveň po zapnutí navážeš tam, kde dítě skončilo.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Co umí</h2>
        <p className="text-sm text-amber-700 mb-3">
          Barevná mapa po jednotlivých příkladech. Červeně se teprve učí, zeleně už umí.
        </p>
        <Heatmap cards={cards} unlockedTables={unlockedTables} divisionEnabled={divisionEnabled} />
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
        <h2 className="text-xl font-semibold text-amber-900 mb-1">Sčítání a odčítání: kde chybuje</h2>
        <p className="text-sm text-amber-700 mb-3">
          Příklady, které dítě spletlo a ještě se k nim vracíme.
        </p>
        {arithCards.length ? (
          <div className="flex flex-wrap gap-2">
            {arithCards.map(card => (
              <span
                key={card.id}
                className="rounded-xl bg-white shadow px-3 py-1.5 text-amber-900 tabular-nums"
                title={`viděno ${card.totalSeen}× · správně ${card.totalCorrect}×`}
              >
                {formatQuestion(card)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-amber-700">Zatím žádné rozpracované chyby.</p>
        )}
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

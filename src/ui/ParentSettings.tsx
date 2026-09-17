import { CLOCK_LEVELS, CLOCK_LEVEL_LABELS, cardsForClockLevel, clockLevelOf, isClockOp } from '../core/clock'
import { useEffect, useState } from 'react'
import type { Card, Session, ClockLevel } from '../core/types'
import { todayStats, weekStats } from '../core/stats'
import { formatQuestion, isArithOp } from '../core/cards'
import { Heatmap, HeatmapSwatch } from './Heatmap'
import { useEink } from '../eink'

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
  const [eink, setEink] = useEink()
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
    <div className="flex flex-col h-full bg-paper text-ink p-6 space-y-6 overflow-y-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Pro rodiče</h1>
        <button type="button" onClick={onBack} className="text-ink underline text-base">
          Zpět
        </button>
      </header>

      <section className="space-y-2">
        <label htmlFor="child-name" className="block text-xl font-semibold text-ink">
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
          className="rounded-2xl bg-card px-5 py-3 text-xl border-[1.5px] border-ink w-full max-w-sm text-ink"
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Řady násobilky</h2>
        <p className="text-sm text-ink mb-4">
          Zaškrtni jen ty řady, které právě probírá ve škole.
        </p>
        <div className="grid grid-cols-5 gap-3 max-w-2xl">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const on = unlocked.has(n)
            return (
              <label
                key={n}
                className={`flex items-center justify-center space-x-2 rounded-2xl p-4 border-[1.5px] border-ink cursor-pointer select-none ${
                  on ? 'bg-accent text-accent-fg' : 'bg-card'
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`Řada ${n}`}
                  checked={on}
                  onChange={() => onToggleTable(n)}
                  className="w-5 h-5"
                />
                <span className="text-2xl font-bold tabular-nums">{n}×</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-ink mt-2 max-w-md">
          Pokrok zůstává — vypnutou řadu po zapnutí navážeš tam, kde dítě skončilo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Operace</h2>
        <div className="flex flex-col space-y-3 items-start">
          <label className="inline-flex items-center space-x-3 rounded-2xl bg-card border-[1.5px] border-ink px-4 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={divisionEnabled}
              onChange={onToggleDivision}
              className="w-5 h-5"
            />
            <span className="text-lg text-ink">Procvičovat i dělení</span>
          </label>
          <p className="text-xs text-ink mt-2 max-w-md">
            Ke každému příkladu typu <span className="tabular-nums">6 × 7</span> přidá i opačný{' '}
            <span className="tabular-nums">42 ÷ 6</span>. Pokrok pro každý směr je samostatný.
          </p>
          <label className="inline-flex items-center space-x-3 rounded-2xl bg-card border-[1.5px] border-ink px-4 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={arithEnabled}
              onChange={onToggleArith}
              className="w-5 h-5"
            />
            <span className="text-lg text-ink">Sčítání a odčítání do 100</span>
          </label>
          <p className="text-xs text-ink mt-2 max-w-md">
            Přidá na úvodní obrazovku druhou hru. Příklady jsou náhodné do 100, chybné se vrací, dokud je dítě neumí.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Zobrazení</h2>
        <div className="flex flex-col space-y-3 items-start">
          <label className="inline-flex items-center space-x-3 rounded-2xl bg-card border-[1.5px] border-ink px-4 py-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={eink}
              onChange={e => setEink(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-lg text-ink">Režim pro e-ink čtečku</span>
          </label>
          <p className="text-xs text-ink mt-2 max-w-md">
            Bez animací, černobíle a s vysokým kontrastem. Platí pro toto zařízení, ne pro profil.
            Zapne se i otevřením adresy s <span className="font-mono">?eink=1</span>.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Hodiny</h2>
        <label className="inline-flex items-center space-x-3 rounded-2xl bg-card border-[1.5px] border-ink px-4 py-3 cursor-pointer select-none">
          <input type="checkbox" checked={clockEnabled} onChange={onToggleClock} className="w-5 h-5" />
          <span className="text-lg text-ink">Poznávání hodin</span>
        </label>
        <p className="text-xs text-ink mt-2 max-w-md">Třetí hra na úvodní obrazovce. Úrovně odemykej postupně podle toho, co dítě zvládá.</p>
        <div className="flex flex-col space-y-2 max-w-md mt-3">
          {CLOCK_LEVELS.map(level => {
            const label = CLOCK_LEVEL_LABELS[level]
            const mastered = cards.filter(c => isClockOp(c.op) && clockLevelOf(c) === level && c.box >= 4).length
            const total = cardsForClockLevel('', level).length
            return (
              <label key={level} className={`flex items-center space-x-2 rounded-2xl p-3 border-[1.5px] border-ink cursor-pointer ${clockLevels.includes(level) ? 'bg-accent text-accent-fg' : 'bg-card'}`}>
                <input type="checkbox" aria-label={`Úroveň ${label}`} checked={clockLevels.includes(level)} onChange={() => onToggleClockLevel(level)} className="w-5 h-5" />
                <span>{label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-sm">{mastered} / {total} umí</span>
              </label>
            )
          })}
        </div>
        <p className="text-xs text-ink mt-2 max-w-md">Pokrok zůstává — vypnutou úroveň po zapnutí navážeš tam, kde dítě skončilo.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Co umí</h2>
        <p className="text-sm text-ink mb-3">
          Mapa po jednotlivých příkladech. Čím tmavší políčko, tím lépe příklad umí.
        </p>
        <Heatmap cards={cards} unlockedTables={unlockedTables} divisionEnabled={divisionEnabled} />
        <div className="flex space-x-3 mt-3 text-xs text-ink flex-wrap">
          <Legend label="učí se" box={1} />
          <Legend label="zlepšuje se" box={2} />
          <Legend label="ví" box={3} />
          <Legend label="umí" box={4} />
          <Legend label="automaticky" box={5} />
          <Legend label="zamčená řada" box={0} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Sčítání a odčítání: kde chybuje</h2>
        <p className="text-sm text-ink mb-3">
          Příklady, které dítě spletlo a ještě se k nim vracíme.
        </p>
        {arithCards.length ? (
          <div className="flex flex-wrap space-x-2">
            {arithCards.map(card => (
              <span
                key={card.id}
                className="rounded-xl bg-card border-[1.5px] border-ink px-3 py-1.5 text-ink tabular-nums"
                title={`viděno ${card.totalSeen}× · správně ${card.totalCorrect}×`}
              >
                {formatQuestion(card)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink">Zatím žádné rozpracované chyby.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink mb-1">Statistiky</h2>
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

function Legend({ label, box }: { label: string; box: number }) {
  return (
    <span className="inline-flex items-center space-x-1">
      <HeatmapSwatch box={box} />
      {label}
    </span>
  )
}

function StatCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="bg-card rounded-2xl p-4 border-[1.5px] border-ink">
      <div className="text-ink font-semibold mb-1">{title}</div>
      <ul className="text-ink space-y-0.5">
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

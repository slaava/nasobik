import type { Card } from '../core/types'

const RAMP = ['var(--card)', '#e6e6e6', '#bfbfbf', '#8c8c8c', '#4d4d4d', 'var(--ink)']

type Props = {
  cards: Card[]
  unlockedTables: number[]
  divisionEnabled: boolean
}

// 10×10 grid coloured by the Leitner box of each fact. Row = first factor
// (1-10), column = second factor (1-10). When division cards exist for the
// same (a, b) we colour the cell by the worst of the two boxes — the child
// hasn't really "got" a fact until both directions are fluent. The tooltip
// breaks down the per-op state. Locked rows stay grey.
export function Heatmap({ cards, unlockedTables, divisionEnabled }: Props) {
  cards = cards.filter(c => c.op === 'mul' || (divisionEnabled && c.op === 'div'))
  type CellState = { mul?: Card; div?: Card }
  const byKey = new Map<string, CellState>()
  for (const c of cards) {
    const key = `${c.a}-${c.b}`
    const entry = byKey.get(key) ?? {}
    if (c.op === 'mul' || c.op === 'div') entry[c.op] = c
    byKey.set(key, entry)
  }

  return (
    <div className="inline-block bg-card rounded-2xl p-3 border-[1.5px] border-ink">
      <div className="grid grid-cols-11 gap-1 text-xs">
        <div />
        {Array.from({ length: 10 }, (_, i) => i + 1).map(b => (
          <div key={`col-${b}`} className="text-center text-ink font-semibold py-1 tabular-nums">
            {b}
          </div>
        ))}
        {Array.from({ length: 10 }, (_, i) => i + 1).map(a => (
          <div key={`row-${a}`} className="contents">
            <div className="text-center text-ink font-semibold py-1 tabular-nums">{a}</div>
            {Array.from({ length: 10 }, (_, j) => j + 1).map(b => {
              const cell = unlockedTables.includes(a) ? byKey.get(`${a}-${b}`) ?? {} : {}
              const boxes = [cell.mul?.box, cell.div?.box].filter((x): x is Card['box'] => x !== undefined)
              const box = boxes.length === 0 ? 0 : Math.min(...boxes)
              const title = describeCell(a, b, cell)
              return (
                <div
                  key={`cell-${a}-${b}`}
                  data-cell
                  data-box={box}
                  title={title}
                  style={{ background: RAMP[box] }}
                  className="w-7 h-7 rounded border border-ink"
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function describeCell(a: number, b: number, cell: { mul?: Card; div?: Card }): string {
  if (!cell.mul && !cell.div) return `${a} × ${b} (řada zamčená)`
  const lines: string[] = []
  if (cell.mul) {
    lines.push(`${a} × ${b} = ${a * b} · viděno ${cell.mul.totalSeen}× · správně ${cell.mul.totalCorrect}×`)
  }
  if (cell.div) {
    lines.push(`${a * b} ÷ ${a} = ${b} · viděno ${cell.div.totalSeen}× · správně ${cell.div.totalCorrect}×`)
  }
  return lines.join('\n')
}

export function HeatmapSwatch({ box }: { box: number }) {
  return <span className="inline-block w-3 h-3 rounded border border-ink" style={{ background: RAMP[box] }} />
}

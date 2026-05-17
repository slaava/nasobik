import type { Card } from '../core/types'

const BOX_COLOR: Record<number, string> = {
  0: 'bg-gray-200',
  1: 'bg-red-300',
  2: 'bg-orange-300',
  3: 'bg-yellow-300',
  4: 'bg-lime-400',
  5: 'bg-green-600',
}

type Props = {
  cards: Card[]
}

// 10×10 grid coloured by the Leitner box of each fact. Row = first factor
// (1-10), column = second factor (1-10). Cells without a corresponding card
// (i.e. the row's table is currently locked) stay grey.
export function Heatmap({ cards }: Props) {
  const byKey = new Map<string, Card>()
  for (const c of cards) byKey.set(`${c.a}-${c.b}`, c)

  return (
    <div className="inline-block bg-white rounded-2xl p-3 shadow">
      <div className="grid grid-cols-11 gap-1 text-xs">
        <div />
        {Array.from({ length: 10 }, (_, i) => i + 1).map(b => (
          <div key={`col-${b}`} className="text-center text-amber-800 font-semibold py-1 tabular-nums">
            {b}
          </div>
        ))}
        {Array.from({ length: 10 }, (_, i) => i + 1).map(a => (
          <div key={`row-${a}`} className="contents">
            <div className="text-center text-amber-800 font-semibold py-1 tabular-nums">{a}</div>
            {Array.from({ length: 10 }, (_, j) => j + 1).map(b => {
              const card = byKey.get(`${a}-${b}`)
              const box = card?.box ?? 0
              const title = card
                ? `${a} × ${b} = ${a * b} · viděno ${card.totalSeen}× · správně ${card.totalCorrect}×`
                : `${a} × ${b} (řada zamčená)`
              return (
                <div
                  key={`cell-${a}-${b}`}
                  data-cell
                  data-box={box}
                  title={title}
                  className={`w-7 h-7 rounded ${BOX_COLOR[box]}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

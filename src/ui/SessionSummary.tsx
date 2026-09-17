import { CatHead } from '../scenes/cat/CatHead'
import { Bubble } from '../scenes/cat/Bubble'
import { pickPhrase } from '../scenes/cat/phrases'

type Props = {
  correctCount: number
  wrongCount: number
  onPlayAgain: () => void
  onDone: () => void
}

export function SessionSummary({ correctCount, wrongCount, onPlayAgain, onDone }: Props) {
  const good = wrongCount === 0 || wrongCount * 4 <= correctCount
  return (
    <div className="flex flex-col items-center justify-center h-full bg-paper text-ink p-8 space-y-6">
      <CatHead mood={good ? 'happy' : 'neutral'} className="w-40 h-32" />
      <Bubble>{pickPhrase(good ? 'finish-good' : 'finish-mixed', correctCount + wrongCount)}</Bubble>
      <div className="text-xl text-ink text-center space-y-1">
        <div>{correctCount} × správně</div>
        {wrongCount > 0 && <div>{wrongCount} × se ještě poučíme</div>}
      </div>
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-2xl bg-accent text-accent-fg border-2 border-accent py-4 px-6 text-xl font-bold active:scale-95"
        >
          Hrát znovu
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-card text-ink border-2 border-ink py-4 px-6 text-xl font-bold active:scale-95"
        >
          Hotovo
        </button>
      </div>
    </div>
  )
}

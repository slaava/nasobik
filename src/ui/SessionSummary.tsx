import beeIdleUrl from '../scenes/bee/assets/bee-idle.svg'

type Props = {
  correctCount: number
  wrongCount: number
  onPlayAgain: () => void
  onDone: () => void
}

export function SessionSummary({ correctCount, wrongCount, onPlayAgain, onDone }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-amber-50 p-8 gap-6">
      <img src={beeIdleUrl} alt="" className="h-[35vh] w-auto select-none" draggable={false} />
      <h1 className="text-4xl font-bold text-amber-900 text-center">
        Nakrmila jsi včelku!
      </h1>
      <div className="text-xl text-amber-800 text-center space-y-1">
        <div>{correctCount} × správně 🍯</div>
        {wrongCount > 0 && <div>{wrongCount} × se ještě poučíme 🌱</div>}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-2xl bg-amber-500 text-white py-4 px-6 text-xl font-bold shadow active:scale-95"
        >
          Hrát znovu
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-white text-amber-900 py-4 px-6 text-xl font-bold shadow active:scale-95"
        >
          Hotovo
        </button>
      </div>
    </div>
  )
}

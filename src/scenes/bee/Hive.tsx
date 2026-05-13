import type { SceneCtx } from '../types'

export function Hive({ correctCount, goalCount }: SceneCtx) {
  const ratio = goalCount === 0 ? 0 : Math.min(correctCount / goalCount, 1)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="text-6xl lg:text-7xl leading-none">🍯</div>
      <div className="w-40 lg:w-56 h-4 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="text-base lg:text-lg text-amber-900 font-semibold tabular-nums">
        {correctCount} / {goalCount}
      </div>
    </div>
  )
}

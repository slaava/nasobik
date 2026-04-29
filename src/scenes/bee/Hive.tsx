import type { SceneCtx } from '../types'

export function Hive({ correctCount, goalCount }: SceneCtx) {
  const ratio = goalCount === 0 ? 0 : Math.min(correctCount / goalCount, 1)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-5xl">🍯</div>
      <div className="w-32 h-3 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="text-sm text-amber-900 font-semibold">
        {correctCount} / {goalCount}
      </div>
    </div>
  )
}

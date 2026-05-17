import type { SceneCtx } from '../types'

export function Hive({ correctCount, goalCount }: SceneCtx) {
  const ratio = goalCount === 0 ? 0 : Math.min(correctCount / goalCount, 1)
  return (
    <div className="flex flex-col items-center gap-0.5 [@media(min-height:760px)]:gap-1 lg:gap-1.5">
      <div className="text-4xl [@media(min-height:760px)]:text-5xl lg:text-7xl leading-none">🍯</div>
      <div className="w-24 [@media(min-height:760px)]:w-32 lg:w-56 h-2 [@media(min-height:760px)]:h-3 lg:h-4 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="text-xs [@media(min-height:760px)]:text-sm lg:text-lg text-amber-900 font-semibold tabular-nums">
        {correctCount} / {goalCount}
      </div>
    </div>
  )
}

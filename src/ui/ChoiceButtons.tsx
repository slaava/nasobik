import { formatTime } from '../core/clock'
import { ClockFace } from './ClockFace'

export function ChoiceButtons({ options, kind, onPick }: {
  options: number[]
  kind: 'digital' | 'clock'
  onPick: (value: number) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-sm w-full">
      {options.map(value => (
        <button key={value} type="button" aria-label={formatTime(value)} onClick={() => onPick(value)}
          className={kind === 'digital'
            ? 'rounded-2xl bg-white shadow-md py-3 [@media(min-height:760px)]:py-4 lg:py-6 text-2xl lg:text-3xl font-bold text-amber-900 tabular-nums active:scale-95 min-h-[3.5rem]'
            : 'rounded-2xl bg-white shadow-md p-2 active:scale-95 min-h-[3.5rem] flex justify-center'}
        >
          {kind === 'digital' ? formatTime(value) : <ClockFace hour={Math.floor(value / 100)} minute={value % 100} showMinuteRing={false} className="h-[22vw] w-[22vw] max-h-[13dvh] max-w-[13dvh] lg:h-32 lg:w-32" />}
        </button>
      ))}
    </div>
  )
}

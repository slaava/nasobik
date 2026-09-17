import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import type { SceneCtx } from '../types'
import beeIdleUrl from './assets/bee-idle.svg'
import { useEink } from '../../eink'

const IDLE_ANIM = {
  y: ['0%', '-3%', '0%'],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
}

const CORRECT_ANIM = {
  y: ['0%', '-15%', '0%'],
  rotate: [0, 10, -10, 0],
  transition: { duration: 0.6 },
}

const WRONG_ANIM = {
  x: ['0%', '-4%', '4%', '-4%', '0%'],
  transition: { duration: 0.6 },
}

const IMG_CLASS = 'max-h-[22dvh] lg:max-h-[60vh] lg:h-[60vh] w-auto max-w-full select-none'

export function Bee(ctx: SceneCtx) {
  const [eink] = useEink()
  return eink ? <StaticBee {...ctx} /> : <AnimatedBee {...ctx} />
}

// E-ink: no motion at all. The reaction to the last answer is a static badge
// next to the bee, redrawn once per answer — one partial refresh, no smear.
function StaticBee({ lastEvent, correctCount, wrongCount }: SceneCtx) {
  const totalAnswers = correctCount + wrongCount
  const badge = totalAnswers === 0 || lastEvent === 'idle' ? null : lastEvent === 'correct' ? '✓' : '✗'
  return (
    <div className="relative">
      <img src={beeIdleUrl} alt="" draggable={false} className={IMG_CLASS} />
      {badge && (
        <span
          data-testid="bee-badge"
          className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-2xl font-bold leading-none text-black lg:h-16 lg:w-16 lg:text-4xl"
        >
          {badge}
        </span>
      )}
    </div>
  )
}

function AnimatedBee({ lastEvent, correctCount, wrongCount }: SceneCtx) {
  const controls = useAnimationControls()
  const totalAnswers = correctCount + wrongCount

  useEffect(() => {
    void controls.start(IDLE_ANIM)
  }, [controls])

  useEffect(() => {
    if (totalAnswers === 0) return
    const reaction = lastEvent === 'correct' ? CORRECT_ANIM : WRONG_ANIM
    let cancelled = false
    void controls.start(reaction).then(() => {
      if (cancelled) return
      void controls.start(IDLE_ANIM)
    })
    return () => {
      cancelled = true
    }
  }, [totalAnswers, lastEvent, controls])

  return (
    <motion.img
      src={beeIdleUrl}
      alt=""
      draggable={false}
      animate={controls}
      className={IMG_CLASS}
    />
  )
}

import { motion, useAnimationControls } from 'framer-motion'
import { useEffect } from 'react'
import type { SceneCtx } from '../types'
import beeIdleUrl from './assets/bee-idle.svg'

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

export function Bee({ lastEvent, correctCount, wrongCount }: SceneCtx) {
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
      className="max-h-[22dvh] lg:max-h-[60vh] lg:h-[60vh] w-auto max-w-full select-none"
    />
  )
}

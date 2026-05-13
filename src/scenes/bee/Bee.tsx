import { motion } from 'framer-motion'
import type { SceneCtx } from '../types'
import beeIdleUrl from './assets/bee-idle.svg'

export function Bee({ lastEvent, correctCount, wrongCount }: SceneCtx) {
  const totalAnswers = correctCount + wrongCount
  return (
    <motion.img
      key={totalAnswers}
      src={beeIdleUrl}
      alt=""
      draggable={false}
      animate={
        lastEvent === 'correct'
          ? { y: ['0%', '-15%', '0%'], rotate: [0, 10, -10, 0] }
          : lastEvent === 'wrong'
            ? { x: ['0%', '-4%', '4%', '-4%', '0%'] }
            : { y: ['0%', '-3%', '0%'] }
      }
      transition={
        lastEvent === 'idle'
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.6 }
      }
      className="h-[22vh] lg:h-[60vh] w-auto max-w-full select-none"
    />
  )
}

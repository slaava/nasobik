import { motion } from 'framer-motion'
import type { SceneCtx } from '../types'

export function Bee({ lastEvent }: SceneCtx) {
  return (
    <motion.div
      animate={
        lastEvent === 'correct'
          ? { y: [0, -20, 0], rotate: [0, 10, -10, 0] }
          : lastEvent === 'wrong'
            ? { x: [0, -8, 8, -8, 0] }
            : { y: [0, -6, 0] }
      }
      transition={
        lastEvent === 'idle'
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.6 }
      }
      className="text-7xl select-none"
    >
      🐝
    </motion.div>
  )
}

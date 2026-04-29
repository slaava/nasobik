import type { Scene } from '../types'
import { Bee } from './Bee'
import { Hive } from './Hive'

export const beeScene: Scene = {
  id: 'bee',
  name: 'Včelka',
  thumbnail: '🐝',
  goalCount: 20,
  Hero: Bee,
  Container: Hive,
}

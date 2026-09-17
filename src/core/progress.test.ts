// src/core/progress.test.ts
import { describe, it, expect } from 'vitest'
import { masteryDots, streakOf } from './progress'
import { freshCard } from './cards'
import type { Card, AnswerEvent } from './types'

const card = (op: Card['op'], a: number, b: number, box: Card['box']): Card => ({ ...freshCard('p', op, a, b), box })

describe('masteryDots', () => {
  it('tables: filled = round(total × cards in box ≥ 3 / all mul+div cards)', () => {
    const cards = [card('mul', 1, 1, 3), card('mul', 1, 2, 5), card('div', 1, 1, 1), card('mul', 1, 3, 2)]
    expect(masteryDots(cards, 'tables', 10)).toBe(5)
  })
  it('tables with no cards → 0', () => {
    expect(masteryDots([], 'tables', 10)).toBe(0)
  })
  it('clock: same rule over clk-* cards only', () => {
    const cards = [card('clk-read', 3, 0, 4), card('clk-read', 4, 0, 1), card('mul', 1, 1, 5)]
    expect(masteryDots(cards, 'clock', 10)).toBe(5)
  })
  it('arith: dots invert the mistake queue; empty queue = all filled, capped at 0', () => {
    expect(masteryDots([], 'arith', 10)).toBe(10)
    expect(masteryDots([card('add', 1, 2, 1), card('sub', 5, 2, 2)], 'arith', 10)).toBe(8)
    const many = Array.from({ length: 14 }, (_, i) => card('add', i + 1, 1, 1))
    expect(masteryDots(many, 'arith', 10)).toBe(0)
  })
})

describe('streakOf', () => {
  const ev = (correct: boolean): AnswerEvent => ({ a: 1, b: 1, correct, rt: 1 })
  it('counts trailing correct answers', () => {
    expect(streakOf([ev(true), ev(false), ev(true), ev(true)])).toBe(2)
    expect(streakOf([ev(true), ev(false)])).toBe(0)
    expect(streakOf([])).toBe(0)
  })
})

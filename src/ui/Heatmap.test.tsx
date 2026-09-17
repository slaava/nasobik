import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Heatmap } from './Heatmap'
import { generateCardsForTables, generateArithCard } from '../core/cards'

describe('Heatmap', () => {
  it('renders 100 cells', () => {
    const { container } = render(<Heatmap unlockedTables={[3]} divisionEnabled={true} cards={[]} />)
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(100)
  })

  it('only colours cells that have a card; the rest stay grey (box=0)', () => {
    const cards = generateCardsForTables('p1', [3], false)
    const { container } = render(<Heatmap unlockedTables={[3]} divisionEnabled={true} cards={cards} />)
    expect(container.querySelectorAll('[data-cell][data-box="1"]')).toHaveLength(10)
    expect(container.querySelectorAll('[data-cell][data-box="0"]')).toHaveLength(90)
  })

  it('colours a cell by the worst of its mul/div boxes', () => {
    const cards = generateCardsForTables('p1', [3], true)
    const mul = cards.find(c => c.op === 'mul' && c.a === 3 && c.b === 4)!
    const div = cards.find(c => c.op === 'div' && c.a === 3 && c.b === 4)!
    mul.box = 5
    div.box = 2
    const { container } = render(<Heatmap unlockedTables={[3]} divisionEnabled={true} cards={cards} />)
    expect(container.querySelectorAll('[data-cell][data-box="2"]').length).toBeGreaterThanOrEqual(1)
  })
})

it('ignores arithmetic cards even when their operands match table cells', () => {
  const { container } = render(<Heatmap unlockedTables={[3]} divisionEnabled={true} cards={[
    generateArithCard('p1', () => 0),
    generateArithCard('p1', (() => {
      const values = [0.9, 0, 0]
      let i = 0
      return () => values[i++ % values.length]!
    })()),
  ]} />)
  expect(container.querySelectorAll('[data-cell][data-box="0"]')).toHaveLength(100)
})

it('greys stored locked rows and ignores disabled division in colour and tooltip', () => {
  const cards = generateCardsForTables('p1', [3], true)
  cards.filter(c => c.op === 'mul').forEach(c => { c.box = 5 })
  const { container, rerender } = render(<Heatmap cards={cards} unlockedTables={[]} divisionEnabled />)
  expect(container.querySelectorAll('[data-box="0"]')).toHaveLength(100)
  expect(container.querySelector('[title="3 × 1 (řada zamčená)"]')).toBeInTheDocument()
  rerender(<Heatmap cards={cards} unlockedTables={[3]} divisionEnabled={false} />)
  expect(container.querySelectorAll('[data-box="5"]')).toHaveLength(10)
  expect(container.querySelector('[title*="÷"]')).toBeNull()
})

it('uses a grey ramp via data-box, not hue classes', () => {
  const { container } = render(<Heatmap cards={generateCardsForTables('p1', [1], false)} unlockedTables={[1]} divisionEnabled={false} />)
  expect(container.innerHTML).not.toMatch(/bg-(red|orange|yellow|lime|green|gray)-/)
})

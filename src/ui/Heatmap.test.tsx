import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Heatmap } from './Heatmap'
import { generateCardsForTables } from '../core/cards'

describe('Heatmap', () => {
  it('renders 100 cells', () => {
    const { container } = render(<Heatmap cards={[]} />)
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(100)
  })

  it('only colours cells that have a card; the rest stay grey (box=0)', () => {
    const cards = generateCardsForTables('p1', [3])
    const { container } = render(<Heatmap cards={cards} />)
    expect(container.querySelectorAll('[data-cell][data-box="1"]')).toHaveLength(10)
    expect(container.querySelectorAll('[data-cell][data-box="0"]')).toHaveLength(90)
  })
})

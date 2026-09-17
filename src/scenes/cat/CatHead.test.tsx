// src/scenes/cat/CatHead.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatHead } from './CatHead'
import { Bubble } from './Bubble'

describe('CatHead', () => {
  it.each(['neutral', 'happy', 'surprised'] as const)('renders one svg for mood %s', mood => {
    const { container } = render(<CatHead mood={mood} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('data-mood')).toBe(mood)
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 100')
  })
  it('uses tokens, not literal colours', () => {
    const { container } = render(<CatHead mood="neutral" />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}/i)
    expect(container.innerHTML).toContain('var(--ink)')
  })
})

describe('Bubble', () => {
  it('renders its text', () => {
    render(<Bubble>Ahoj!</Bubble>)
    expect(screen.getByText('Ahoj!')).toBeInTheDocument()
  })
})

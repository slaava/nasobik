import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { beeScene } from '.'

describe('beeScene', () => {
  it('exposes id, name, thumbnail, goalCount', () => {
    expect(beeScene.id).toBe('bee')
    expect(beeScene.goalCount).toBe(20)
  })

  it('Hero renders the bee illustration', () => {
    const { Hero } = beeScene
    const { container } = render(
      <Hero correctCount={0} wrongCount={0} goalCount={20} lastEvent="idle" />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toMatch(/bee-idle/)
  })

  it('Container shows correctCount / goalCount', () => {
    const { Container } = beeScene
    render(<Container correctCount={5} wrongCount={0} goalCount={20} lastEvent="idle" />)
    expect(screen.getByText('5 / 20')).toBeInTheDocument()
  })
})

describe('beeScene in e-ink mode', () => {
  it('Hero renders a static bee with a ✓ badge after a correct answer', () => {
    document.documentElement.dataset.theme = 'eink'
    try {
      const { Hero } = beeScene
      const { container } = render(
        <Hero correctCount={1} wrongCount={0} goalCount={20} lastEvent="correct" />,
      )
      expect(container.querySelector('img')).not.toBeNull()
      expect(screen.getByTestId('bee-badge')).toHaveTextContent('✓')
      // framer-motion adds inline transform styles; the static bee must not.
      expect(container.querySelector('img')!.getAttribute('style')).toBeNull()
    } finally {
      delete document.documentElement.dataset.theme
    }
  })
})

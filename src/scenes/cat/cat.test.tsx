// src/scenes/cat/cat.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { catScene } from '.'
import { PHRASES } from './phrases'

const base = { correctCount: 0, wrongCount: 0, goalCount: 20, streak: 0, phraseSeed: 0 }

describe('catScene', () => {
  it('exposes id and goalCount', () => {
    expect(catScene.id).toBe('cat')
    expect(catScene.goalCount).toBe(20)
  })
  it('Hero: idle → neutral cat, no bubble text from answer events', () => {
    const { container } = render(<catScene.Hero {...base} lastEvent="idle" />)
    expect(container.querySelector('svg[data-mood="neutral"]')).not.toBeNull()
  })
  it('Hero: correct → happy + a correct phrase', () => {
    render(<catScene.Hero {...base} correctCount={1} lastEvent="correct" streak={1} phraseSeed={1} />)
    expect(document.querySelector('svg[data-mood="happy"]')).not.toBeNull()
    expect(screen.getByText(PHRASES.correct[1 % PHRASES.correct.length]!)).toBeInTheDocument()
  })
  it('Hero: 3-streak → streak phrase', () => {
    render(<catScene.Hero {...base} correctCount={3} lastEvent="correct" streak={3} phraseSeed={3} />)
    expect(screen.getByText(PHRASES.streak[3 % PHRASES.streak.length]!)).toBeInTheDocument()
  })
  it('Hero: wrong → surprised, dunno → surprised', () => {
    const { unmount } = render(<catScene.Hero {...base} wrongCount={1} lastEvent="wrong" phraseSeed={1} />)
    expect(document.querySelector('svg[data-mood="surprised"]')).not.toBeNull()
    unmount()
    render(<catScene.Hero {...base} wrongCount={1} lastEvent="dunno" phraseSeed={1} />)
    expect(screen.getByText(PHRASES.dunno[1 % PHRASES.dunno.length]!)).toBeInTheDocument()
  })
  it('Container renders goalCount dots with correctCount filled', () => {
    const { container } = render(<catScene.Container {...base} correctCount={7} lastEvent="idle" />)
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(20)
    expect(container.querySelectorAll('[data-dot="on"]')).toHaveLength(7)
  })
})

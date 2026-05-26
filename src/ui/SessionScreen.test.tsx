import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionScreen } from './SessionScreen'
import { generateCardsForTables } from '../core/cards'
import { beeScene } from '../scenes/bee'

describe('SessionScreen', () => {
  it('shows the first question on mount', () => {
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        cards={cards}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    expect(screen.getByText(/×/)).toBeInTheDocument()
  })

  it('typing the correct answer via numpad advances the hive', async () => {
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        cards={cards}
        goalCount={3}
        scene={beeScene}
        onFinish={() => {}}
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*×\s*(\d+)/)!
    const a = Number(match[1])
    const b = Number(match[2])
    const product = a * b
    for (const ch of String(product)) {
      await userEvent.click(screen.getByRole('button', { name: ch }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument()
  })

  it('calls onFinish when goal reached', async () => {
    const onFinish = vi.fn()
    const cards = generateCardsForTables('p1', [2], false)
    render(
      <SessionScreen
        cards={cards}
        goalCount={1}
        scene={beeScene}
        onFinish={onFinish}
      />,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const match = heading.textContent!.match(/(\d+)\s*×\s*(\d+)/)!
    const product = Number(match[1]) * Number(match[2])
    for (const ch of String(product)) {
      await userEvent.click(screen.getByRole('button', { name: ch }))
    }
    await userEvent.click(screen.getByRole('button', { name: /hotovo/i }))
    expect(onFinish).toHaveBeenCalled()
  })
})

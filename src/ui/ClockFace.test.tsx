import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClockFace, DigitalDisplay } from './ClockFace'

it('uses continuous hour movement and an optional minute ring', () => {
  const { container, rerender } = render(<ClockFace hour={7} minute={30} />)
  expect(screen.getByTestId('clock-face')).toHaveAttribute('data-hour', '7')
  expect(screen.getByTestId('clock-face')).toHaveAttribute('data-minute', '30')
  expect(container.querySelector('line[stroke-width="9"]')).toHaveAttribute('transform', 'rotate(225 100 100)')
  expect(container.querySelector('line[stroke-width="5"]')).toHaveAttribute('transform', 'rotate(180 100 100)')
  expect(screen.queryByText('60')).not.toBeInTheDocument()
  rerender(<ClockFace hour={7} minute={30} showMinuteRing />)
  expect(screen.getByText('60')).toBeInTheDocument()
})

it('renders a digital time', () => {
  render(<DigitalDisplay value={1530} />)
  expect(screen.getByTestId('digital-display')).toHaveTextContent('15:30')
})

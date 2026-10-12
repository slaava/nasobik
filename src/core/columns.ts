// Written (column) addition and subtraction: the answer goes into one box per
// place value, units first, as children write it at school.
import type { Card } from './types'

export type CellInput = { cells: string[]; cursor: number }

// Never derived from the answer, so the box count does not give it away:
// a sum of k-digit numbers has at most k+1 digits, a difference at most len(a).
export function cellCountFor(card: Card): number {
  const a = String(card.a).length
  const b = String(card.b).length
  return card.op === 'add' ? Math.max(a, b) + 1 : a
}

export function emptyCells(n: number): CellInput {
  return { cells: Array.from({ length: n }, () => ''), cursor: n - 1 }
}

// Writes into the active box, then moves one place to the left (stays on the
// leftmost box).
export function typeDigit(input: CellInput, digit: number): CellInput {
  if (input.cells.length === 0) return input
  const cells = input.cells.slice()
  cells[input.cursor] = String(digit)
  return { cells, cursor: Math.max(0, input.cursor - 1) }
}

// Clears the active box; on an empty box steps back right (towards the units)
// and clears that one, mirroring the typing direction.
export function backspace(input: CellInput): CellInput {
  if (input.cells.length === 0) return input
  const cells = input.cells.slice()
  if (cells[input.cursor] !== '') {
    cells[input.cursor] = ''
    return { cells, cursor: input.cursor }
  }
  const cursor = Math.min(cells.length - 1, input.cursor + 1)
  cells[cursor] = ''
  return { cells, cursor }
}

export function selectCell(input: CellInput, index: number): CellInput {
  return { cells: input.cells, cursor: index }
}

// Index of the box that blocks submitting: empty units, or an empty box with a
// filled one to its left. null when the answer is complete.
export function gapIndex(input: CellInput): number | null {
  const { cells } = input
  const last = cells.length - 1
  if (last < 0) return 0
  if (cells[last] === '') return last
  const leftmost = cells.findIndex(c => c !== '')
  for (let i = last - 1; i > leftmost; i--) if (cells[i] === '') return i
  return null
}

export function cellValue(input: CellInput): number | null {
  if (gapIndex(input) !== null) return null
  return Number(input.cells.join(''))
}

export const PLACE_NAMES = ['jednotky', 'desítky', 'stovky', 'tisíce']

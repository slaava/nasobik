import { describe, it, expect } from 'vitest'
import { backspace, cellCountFor, cellValue, emptyCells, gapIndex, selectCell, typeDigit } from './columns'
import { freshCard } from './cards'

describe('column answer cells', () => {
  it('sizes the boxes from the operands, never from the answer', () => {
    expect(cellCountFor(freshCard('p', 'add', 10, 57))).toBe(3)
    expect(cellCountFor(freshCard('p', 'add', 7, 5))).toBe(2)
    expect(cellCountFor(freshCard('p', 'add', 95, 5))).toBe(3)
    expect(cellCountFor(freshCard('p', 'sub', 72, 65))).toBe(2)
    expect(cellCountFor(freshCard('p', 'sub', 100, 1))).toBe(3)
  })

  it('fills units first and moves left, staying on the leftmost box', () => {
    let s = emptyCells(3)
    expect(s.cursor).toBe(2)
    s = typeDigit(s, 2)
    s = typeDigit(s, 7)
    expect(s).toEqual({ cells: ['', '7', '2'], cursor: 0 })
    expect(cellValue(s)).toBe(72)
    s = typeDigit(typeDigit(s, 1), 4)
    expect(s).toEqual({ cells: ['4', '7', '2'], cursor: 0 })
  })

  it('overwrites a tapped box and backspaces towards the units', () => {
    let s = typeDigit(typeDigit(emptyCells(2), 2), 7)
    s = typeDigit(selectCell(s, 1), 3)
    expect(s.cells).toEqual(['7', '3'])
    s = selectCell(s, 0)
    s = backspace(s)
    expect(s).toEqual({ cells: ['', '3'], cursor: 0 })
    s = backspace(s)
    expect(s).toEqual({ cells: ['', ''], cursor: 1 })
  })

  it('refuses empty units and inner gaps but allows leading blanks', () => {
    expect(gapIndex(emptyCells(2))).toBe(1)
    expect(cellValue({ cells: ['', '7', ''], cursor: 2 })).toBeNull()
    expect(gapIndex({ cells: ['1', '', '0'], cursor: 0 })).toBe(1)
    expect(cellValue({ cells: ['', '', '7'], cursor: 1 })).toBe(7)
    expect(cellValue({ cells: ['1', '0', '0'], cursor: 0 })).toBe(100)
  })
})

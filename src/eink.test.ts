import { describe, it, expect, beforeEach } from 'vitest'
import { initEink, isEink, setEink } from './eink'

describe('eink mode', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('is off by default', () => {
    initEink('')
    expect(isEink()).toBe(false)
  })

  it('?eink=1 turns it on and persists', () => {
    initEink('?eink=1')
    expect(isEink()).toBe(true)
    expect(localStorage.getItem('nasobik.eink')).toBe('1')
  })

  it('restores the persisted value without a URL parameter', () => {
    setEink(true)
    delete document.documentElement.dataset.theme
    initEink('')
    expect(isEink()).toBe(true)
  })

  it('?eink=0 overrides a persisted on', () => {
    setEink(true)
    initEink('?eink=0')
    expect(isEink()).toBe(false)
  })
})

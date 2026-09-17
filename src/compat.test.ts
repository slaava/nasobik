/// <reference types="node" />
// src/compat.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Kindle-class WebKit: no dvh (without vh fallback), no gap on flex, no aspect-ratio,
// no inset-*, no :has(), no color-mix(), no container queries.
function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts|css)$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

const src = join(__dirname)
const files = walk(src)
const css = readFileSync(join(src, 'index.css'), 'utf8')

describe('old WebKit compatibility', () => {
  it('every dvh utility has a vh fallback in index.css', () => {
    const used = new Set<string>()
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/[\w:-]*\[(\d+)dvh\]|\bh-dvh\b/g)) used.add(m[0].replace(/^.*?:/, ''))
    }
    for (const cls of used) {
      const n = cls.match(/\[(\d+)dvh\]/)?.[1]
      const needle = cls === 'h-dvh' ? 'height: 100vh; height: 100dvh' : `${n}vh; ${cls.split('-[')[0].replace('h', 'height').replace('w', 'width').replace('max-height', 'max-height')}`
      expect(css, `missing vh fallback for ${cls}`).toContain(n ? `${n}vh; ` : needle)
    }
  })

  it('does not use flex gap, aspect-ratio, inset utilities or modern CSS functions', () => {
    const bad: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      for (const line of text.split('\n')) {
        if (/className=.*\bflex\b(?![-\w]).*\bgap-/.test(line) && !/\bgrid\b/.test(line)) bad.push(`${f}: flex+gap: ${line.trim()}`)
        if (/\baspect-|\binset-|:has\(|color-mix\(|@container/.test(line)) bad.push(`${f}: ${line.trim()}`)
      }
    }
    expect(bad).toEqual([])
  })
})

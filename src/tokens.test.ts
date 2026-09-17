// src/tokens.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(__dirname, 'index.css'), 'utf8')
const tw = readFileSync(join(__dirname, '../tailwind.config.js'), 'utf8')

describe('design tokens', () => {
  it.each(['--paper', '--ink', '--card', '--accent', '--accent-fg', '--muted', '--fur', '--nose'])(
    'defines %s on :root and overrides it for e-ink', token => {
      const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
      const eink = css.slice(css.indexOf('[data-theme="eink"] {'), css.indexOf('}', css.indexOf('[data-theme="eink"] {')))
      expect(root).toContain(`${token}:`)
      expect(eink).toContain(`${token}:`)
    })

  it('maps semantic tailwind colours to the variables', () => {
    for (const name of ['paper', 'ink', 'card', 'accent', 'muted', 'fur', 'nose']) {
      expect(tw).toContain(`${name}: 'var(--${name})'`)
    }
    expect(tw).toContain(`'accent-fg': 'var(--accent-fg)'`)
  })
})

/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// GitHub Pages serves the site under /<repo>/, so production assets need a
// matching base. Dev keeps the root so localhost:5173/ works as usual.
export default defineConfig(({ command }) => ({
  // plugin-legacy emits an additional transpiled + polyfilled bundle picked up
  // only by browsers without ES module support (e-ink readers ship WebKits that
  // are years old). Modern browsers keep loading the normal bundle.
  plugins: [react(), legacy({ targets: ['defaults', 'safari >= 9', 'chrome >= 50'] })],
  base: command === 'build' ? '/nasobik/' : '/',
  server: {
    host: true,
    allowedHosts: ['slavik-work', '.ts.net'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}))

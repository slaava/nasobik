/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the site under /<repo>/, so production assets need a
// matching base. Dev keeps the root so localhost:5173/ works as usual.
export default defineConfig(({ command }) => ({
  plugins: [react()],
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

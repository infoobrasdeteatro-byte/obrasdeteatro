import { defineConfig, defaultExclude } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    exclude: [...defaultExclude, '_incidente-trazabilidad-2026-07-19/**'],
  },
})

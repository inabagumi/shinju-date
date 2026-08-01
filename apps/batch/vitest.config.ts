import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})

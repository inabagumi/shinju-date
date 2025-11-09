import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './')
    },
    environment: 'jsdom',
    environmentOptions: {
      url: 'https://shinju-date.test',
    },
    globals: true,
    setupFiles: ['./vitest.setup.ts']
  },
})

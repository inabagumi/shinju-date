import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    environment: 'jsdom',
    environmentOptions: {
      url: 'https://shinju-date.test',
    },
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})

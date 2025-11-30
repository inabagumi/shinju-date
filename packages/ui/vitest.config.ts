import path from 'node:path'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    environment: 'jsdom',
    globals: true,
    projects: [
      // Regular unit tests
      {
        extends: true,
        test: {
          include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
          name: 'unit',
        },
      },
      // Story tests via Storybook addon
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(__dirname, '.storybook') }),
        ],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: 'chromium' }],
            provider: playwright({}),
          },
          name: 'storybook',
        },
      },
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
})

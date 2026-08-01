import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    projects: [
      // Regular unit tests
      {
        extends: true,
        test: {
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          name: 'unit',
        },
      },
      // Story tests via Storybook addon
      {
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
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

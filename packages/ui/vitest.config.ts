import { defineVitestConfig } from '@shinju-date/config/vitest'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

export default defineVitestConfig.react({
  test: {
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

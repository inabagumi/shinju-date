import { devices } from '@playwright/test'
import { definePlaywrightConfig } from '@shinju-date/config/playwright'
import { STORAGE_STATE } from './e2e/storage-state'

/**
 * Playwright configuration for admin app E2E tests
 */
export default definePlaywrightConfig({
  port: 4000,
  projects: [
    // Signs in once and saves the cookies to `STORAGE_STATE`
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    // Tests of the login page itself, which start without the saved session
    {
      name: 'login',
      testMatch: '**/login.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      dependencies: ['setup'],
      name: 'chromium',
      testIgnore: '**/login.spec.ts',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
  ],
  readyPath: '/login',
})

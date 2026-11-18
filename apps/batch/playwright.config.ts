import { definePlaywrightConfig } from '@shinju-date/config/playwright'

/**
 * Playwright configuration for batch app E2E tests
 */
export default definePlaywrightConfig({
  env: {
    GOOGLE_API_KEY: 'fake',
  },
  port: 5000,
  readyPath: '/api/healthz',
})

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE } from './e2e/storage-state'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Playwright configuration for admin app E2E tests
 */
export default defineConfig({
  forbidOnly: !!process.env['CI'],
  fullyParallel: true,

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
  reporter: process.env['CI']
    ? [['github'], ['html', { open: 'never' }]]
    : 'html',
  retries: process.env['CI'] ? 2 : 0,
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'pnpm dev',
    cwd: __dirname,
    env: {
      ENABLE_MSW: 'true',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:4000',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake',
      NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.test',
      NEXT_TELEMETRY_DISABLED: '1',
      SUPABASE_SERVICE_ROLE_KEY: 'fake',
      UPSTASH_REDIS_REST_TOKEN: 'fake',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.test',
    },
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
    url: 'http://localhost:4000/login',
  },
  ...(process.env['CI'] ? { workers: 1 } : {}),
})

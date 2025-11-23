import { defineConfig, devices } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Playwright configuration for batch app E2E tests
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://localhost:5000',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5000/api/healthz',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
    cwd: __dirname,
    env: {
      ENABLE_MSW: 'true',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake',
      NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.test',
      SUPABASE_SERVICE_ROLE_KEY: 'fake',
      UPSTASH_REDIS_REST_TOKEN: 'fake',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.test',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:5000',
      GOOGLE_API_KEY: 'fake',
    },
  },
})

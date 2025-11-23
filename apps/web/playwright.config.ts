import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Playwright configuration for web app E2E tests
 */
export default defineConfig({
  forbidOnly: !!process.env['CI'],
  fullyParallel: true,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: 'html',
  retries: process.env['CI'] ? 2 : 0,
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'pnpm dev',
    cwd: __dirname,
    env: {
      ENABLE_MSW: 'true',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake',
      NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.test',
      UPSTASH_REDIS_REST_TOKEN: 'fake',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.test',
    },
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
    url: 'http://localhost:3000',
  },
  workers: process.env['CI'] ? 1 : undefined,
})

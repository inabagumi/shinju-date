import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Playwright configuration for admin app E2E tests
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
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'pnpm dev',
    cwd: __dirname,
    env: {
      ENABLE_MSW: 'true',
      MSW_SUPABASE_AUTHENTICATED: 'true',
      NEXT_PUBLIC_BASE_URL: 'http://localhost:4000',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake',
      NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.test',
      SUPABASE_SERVICE_ROLE_KEY: 'fake',
      UPSTASH_REDIS_REST_TOKEN: 'fake',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.test',
    },
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
    url: 'http://localhost:4000',
  },
  ...(process.env['CI'] ? { workers: 1 } : {}),
})

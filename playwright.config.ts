import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load test environment files
config({ path: resolve(__dirname, 'apps/web/.env.test') })
config({ path: resolve(__dirname, 'apps/admin/.env.test') })
config({ path: resolve(__dirname, 'apps/batch/.env.test') })

/**
 * See https://playwright.dev/docs/test-configuration.
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
  testDir: './apps',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'cd apps/web && pnpm dev',
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
    {
      command: 'cd apps/admin && pnpm dev',
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
    {
      command: 'cd apps/batch && pnpm dev',
      cwd: __dirname,
      env: {
        ENABLE_MSW: 'true',
        GOOGLE_API_KEY: 'fake',
        NEXT_PUBLIC_BASE_URL: 'http://localhost:5000',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake',
        NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.test',
        SUPABASE_SERVICE_ROLE_KEY: 'fake',
        UPSTASH_REDIS_REST_TOKEN: 'fake',
        UPSTASH_REDIS_REST_URL: 'https://fake.upstash.test',
      },
      reuseExistingServer: !process.env['CI'],
      timeout: 120 * 1000,
      url: 'http://localhost:5000',
    },
  ],
  workers: process.env['CI'] ? 1 : undefined,
})

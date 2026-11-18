import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // The required variables of `lib/env.ts`, which is checked on import.
    // The keys of Supabase differ, so the tests can tell which one a request
    // was sent with (`test/supabase.ts`).
    env: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon-key',
      NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.test',
      SUPABASE_SERVICE_ROLE_KEY: 'fake-service-role-key',
      UPSTASH_REDIS_REST_TOKEN: 'fake',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.test',
    },
    environment: 'jsdom',
    environmentOptions: {
      url: 'https://shinju-date.test',
    },
    exclude: ['**/node_modules/**', '**/e2e/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})

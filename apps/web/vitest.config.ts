import { defineVitestConfig } from "@shinju-date/config/vitest";

export default defineVitestConfig.react({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // The required variables of `lib/env.ts`, which is checked on import.
    // The keys of Supabase differ, so the tests can tell which one a request
    // was sent with (`test/supabase.ts`).
    env: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
      UPSTASH_REDIS_REST_TOKEN: "fake",
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.test",
    },
    environmentOptions: {
      url: "https://shinju-date.test",
    },
    exclude: ["**/node_modules/**", "**/e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});

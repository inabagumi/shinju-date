import { defineVitestConfig } from "@shinju-date/config/vitest";

export default defineVitestConfig.react({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // The required variables of `lib/env.ts`, which is checked on import.
    env: {
      GOOGLE_API_KEY: "fake",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake",
      NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: "fake",
      TWITCH_CLIENT_ID: "fake",
      TWITCH_CLIENT_SECRET: "fake",
      UPSTASH_REDIS_REST_TOKEN: "fake",
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.test",
    },
    exclude: ["**/node_modules/**", "**/e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});

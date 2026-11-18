import { defineVitestConfig } from "@shinju-date/config/vitest";

export default defineVitestConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // The required variables of `lib/env.ts`, which is checked on import.
    env: {
      // Unset even when the shell has it, so that the cron routes do not
      // check the secret unless a test asks for it.
      CRON_SECRET: "",
      GOOGLE_API_KEY: "fake",
      NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: "fake",
      TWITCH_CLIENT_ID: "fake",
      TWITCH_CLIENT_SECRET: "fake",
      UPSTASH_REDIS_REST_TOKEN: "fake",
      UPSTASH_REDIS_REST_URL: "https://fake.upstash.test",
    },
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});

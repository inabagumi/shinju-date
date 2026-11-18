import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";

export interface PlaywrightConfigOptions extends Omit<
  PlaywrightTestConfig,
  "webServer"
> {
  /**
   * The environment variables that only this app needs. They are added to
   * the shared ones, which they can also override.
   */
  env?: Record<string, string>;
  /** The port that `pnpm dev` of the app listens on. */
  port: number;
  /**
   * The path that Playwright waits for to respond before it starts the
   * tests. Defaults to `/`.
   */
  readyPath?: string;
}

/**
 * The fake values for Supabase and Upstash Redis. MSW answers the requests
 * to these URLs, so the dev server never reaches the real services.
 */
const fakeServiceEnv = {
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake",
  NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "fake",
  UPSTASH_REDIS_REST_TOKEN: "fake",
  UPSTASH_REDIS_REST_URL: "https://fake.upstash.test",
} as const satisfies Record<string, string>;

/**
 * Returns the Playwright configuration for the E2E tests of an app in
 * `apps/*`.
 *
 * - Runs the tests in `e2e/**\/*.spec.ts` on Desktop Chrome
 * - Starts the dev server (`pnpm dev`) in the directory of the app's
 *   `playwright.config.ts` (the default `cwd` of `webServer`), with MSW
 *   enabled and the fake values for Supabase and Upstash Redis
 * - On CI: retries twice, runs one worker, reports to GitHub, and starts a
 *   new dev server even when one is already running
 *
 * Pass `projects` and the other settings of Playwright only when an app
 * needs them.
 *
 * @example
 * ```ts
 * import { definePlaywrightConfig } from '@shinju-date/config/playwright'
 *
 * export default definePlaywrightConfig({
 *   port: 3000,
 * })
 * ```
 */
export function definePlaywrightConfig({
  env = {},
  port,
  readyPath = "/",
  ...overrides
}: PlaywrightConfigOptions): PlaywrightTestConfig {
  const isCI = !!process.env["CI"];
  const baseURL = `http://localhost:${port}`;

  return defineConfig({
    forbidOnly: isCI,
    fullyParallel: true,
    projects: [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
    ],
    reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
    retries: isCI ? 2 : 0,
    testDir: "./e2e",
    testMatch: "**/*.spec.ts",
    ...(isCI ? { workers: 1 } : {}),
    ...overrides,
    use: {
      baseURL,
      trace: "on-first-retry",
      ...overrides.use,
    },
    webServer: {
      command: "pnpm dev",
      env: {
        ENABLE_MSW: "true",
        NEXT_PUBLIC_BASE_URL: baseURL,
        NEXT_TELEMETRY_DISABLED: "1",
        ...fakeServiceEnv,
        ...env,
      },
      reuseExistingServer: !isCI,
      timeout: 120 * 1000,
      url: new URL(readyPath, baseURL).toString(),
    },
  });
}

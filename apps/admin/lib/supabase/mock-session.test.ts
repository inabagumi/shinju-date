import { MOCK_SUPABASE_SESSION } from "@shinju-date/msw-handlers/session";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/lib/env";

import { withMockSessionCookie } from "./mock-session";

const { serverEnv } = vi.hoisted(() => ({
  // Only has the variables that the module under test reads
  serverEnv: {
    ENABLE_MSW: false,
    MSW_SUPABASE_AUTHENTICATED: false,
  } as Partial<ServerEnv> as ServerEnv,
}));

vi.mock(import("@/lib/env"), () => ({ serverEnv }));

const SUPABASE_URL = "https://fake.supabase.test";

describe(withMockSessionCookie, () => {
  beforeEach(() => {
    serverEnv.ENABLE_MSW = false;
    serverEnv.MSW_SUPABASE_AUTHENTICATED = false;
  });

  it("adds the mock session when MSW_SUPABASE_AUTHENTICATED is true", async () => {
    serverEnv.ENABLE_MSW = true;
    serverEnv.MSW_SUPABASE_AUTHENTICATED = true;

    const cookies = [{ name: "other", value: "value" }];

    await expect(
      withMockSessionCookie(SUPABASE_URL, cookies)
    ).resolves.toStrictEqual([
      { name: "other", value: "value" },
      {
        name: "sb-fake-auth-token",
        value: JSON.stringify(MOCK_SUPABASE_SESSION),
      },
    ]);
  });

  it.each(["sb-fake-auth-token", "sb-fake-auth-token.0"])(
    "keeps the session cookie (%s) of a signed-in user",
    async (name) => {
      serverEnv.ENABLE_MSW = true;
      serverEnv.MSW_SUPABASE_AUTHENTICATED = true;

      const cookies = [{ name, value: "session" }];

      await expect(
        withMockSessionCookie(SUPABASE_URL, cookies)
      ).resolves.toStrictEqual(cookies);
    }
  );

  it.each([
    { ENABLE_MSW: true, MSW_SUPABASE_AUTHENTICATED: false },
    { ENABLE_MSW: false, MSW_SUPABASE_AUTHENTICATED: true },
    { ENABLE_MSW: false, MSW_SUPABASE_AUTHENTICATED: false },
  ])("does not add the mock session with %o", async (env) => {
    Object.assign(serverEnv, env);

    await expect(
      withMockSessionCookie(SUPABASE_URL, [])
    ).resolves.toStrictEqual([]);
  });
});

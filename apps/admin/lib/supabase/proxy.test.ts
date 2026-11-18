// @vitest-environment node

import { server } from "@shinju-date/msw-handlers/server";
import { NextRequest } from "next/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ServerEnv } from "@/lib/env";

import { updateSession } from "./proxy";

const { serverEnv } = vi.hoisted(() => ({
  // Only has the variables that the module under test reads
  serverEnv: {
    ENABLE_MSW: true,
    MSW_SUPABASE_AUTHENTICATED: false,
  } as Partial<ServerEnv> as ServerEnv,
}));

// `NEXT_PUBLIC_SUPABASE_URL` and the anonymous key come from `test.env` of
// `vitest.config.ts`.
vi.mock(import("@/lib/env"), async (importOriginal) => ({
  ...(await importOriginal()),
  serverEnv,
}));

/**
 * MSW のモックに対して `updateSession()` を実行し、
 * `MSW_SUPABASE_AUTHENTICATED` の設定が反映されることを確認する。
 */
describe("updateSession with MSW", () => {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  function stubEnv(authenticated: boolean) {
    serverEnv.MSW_SUPABASE_AUTHENTICATED = authenticated;
  }

  it("lets requests without cookies through when MSW_SUPABASE_AUTHENTICATED is true", async () => {
    stubEnv(true);

    const response = await updateSession(
      new NextRequest("http://localhost:4000/analytics/click")
    );

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects /login to the dashboard when MSW_SUPABASE_AUTHENTICATED is true", async () => {
    stubEnv(true);

    const response = await updateSession(
      new NextRequest("http://localhost:4000/login")
    );

    expect(response.headers.get("location")).toBe("http://localhost:4000/");
  });

  it("redirects /login to the requested page when MSW_SUPABASE_AUTHENTICATED is true", async () => {
    stubEnv(true);

    const response = await updateSession(
      new NextRequest(
        "http://localhost:4000/login?next=%2Fanalytics%2Fclick%3Ffrom%3D2025-11-01"
      )
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4000/analytics/click?from=2025-11-01"
    );
  });

  it.each(["%2F%2Fexample.com", "%2F.%2F%2Fexample.com", "%2F.%2F%2F"])(
    "does not redirect /login?next=%s to an external URL",
    async (next) => {
      stubEnv(true);

      const response = await updateSession(
        new NextRequest(`http://localhost:4000/login?next=${next}`)
      );

      expect(response.headers.get("location")).toBe("http://localhost:4000/");
    }
  );

  it("redirects requests without cookies to the login page otherwise", async () => {
    stubEnv(false);

    const response = await updateSession(
      new NextRequest("http://localhost:4000/analytics/click")
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4000/login?next=%2Fanalytics%2Fclick"
    );
  });

  it("keeps the query string of the requested page", async () => {
    stubEnv(false);

    const response = await updateSession(
      new NextRequest("http://localhost:4000/analytics/click?from=2025-11-01")
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4000/login?next=%2Fanalytics%2Fclick%3Ffrom%3D2025-11-01"
    );
  });

  it("does not add the redirect parameter for the dashboard", async () => {
    stubEnv(false);

    const response = await updateSession(
      new NextRequest("http://localhost:4000/")
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:4000/login"
    );
  });
});

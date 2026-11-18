import type * as Sentry from "@sentry/nextjs";
import type * as MswServer from "@shinju-date/msw-handlers/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequestError, registerServer } from "./server.js";

const sentry = vi.hoisted(() => ({
  captureRequestError: vi.fn<typeof Sentry.captureRequestError>(),
  init: vi.fn<typeof Sentry.init>(),
}));
const startServer = vi.hoisted(() => vi.fn<typeof MswServer.startServer>());

vi.mock(import("@sentry/nextjs"), () => sentry);
vi.mock(import("@sentry/profiling-node"), () => ({
  nodeProfilingIntegration: () => ({ name: "ProfilingIntegration" }),
}));
vi.mock(import("@supabase/sentry-js-integration"), () => ({
  supabaseIntegration: () => ({ name: "SupabaseIntegration" }),
}));
vi.mock(import("@supabase/supabase-js"), () => ({
  // supabaseIntegration is mocked, so the client class is only a placeholder.
  SupabaseClient: {} as Partial<typeof SupabaseClient> as typeof SupabaseClient,
}));
vi.mock(import("@shinju-date/msw-handlers/server"), () => ({ startServer }));

const options = {
  enableMsw: false,
  profileSessionSampleRate: 0.5,
  tracesSampleRate: 0.25,
};

describe("server instrumentation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@example.com/1");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("VERCEL_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe(registerServer, () => {
    it("initializes Sentry for Node.js with the profiler", async () => {
      await registerServer(options);

      expect(sentry.init).toHaveBeenCalledExactlyOnceWith({
        dsn: "https://key@example.com/1",
        enabled: true,
        environment: "production",
        integrations: [
          { name: "ProfilingIntegration" },
          { name: "SupabaseIntegration" },
        ],
        profileLifecycle: "trace",
        profileSessionSampleRate: 0.5,
        tracesSampleRate: 0.25,
      });
    });

    it("initializes Sentry for Edge without the profiler", async () => {
      vi.stubEnv("NEXT_RUNTIME", "edge");

      await registerServer(options);

      expect(sentry.init).toHaveBeenCalledExactlyOnceWith({
        dsn: "https://key@example.com/1",
        enabled: true,
        environment: "production",
        integrations: [{ name: "SupabaseIntegration" }],
        tracesSampleRate: 0.25,
      });
    });

    it("disables Sentry outside of production", async () => {
      vi.stubEnv("VERCEL_ENV", undefined);

      await registerServer(options);

      expect(sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false, environment: "development" })
      );
    });

    it("does not initialize Sentry without the DSN", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);

      await registerServer(options);

      expect(sentry.init).not.toHaveBeenCalled();
    });

    it("starts MSW on Node.js when enableMsw is true", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);

      await registerServer({ ...options, enableMsw: true });

      expect(startServer).toHaveBeenCalledOnce();
    });

    it("does not start MSW on Edge", async () => {
      vi.stubEnv("NEXT_RUNTIME", "edge");

      await registerServer({ ...options, enableMsw: true });

      expect(startServer).not.toHaveBeenCalled();
    });

    it("does not start MSW when enableMsw is false", async () => {
      await registerServer(options);

      expect(startServer).not.toHaveBeenCalled();
    });
  });

  describe(onRequestError, () => {
    const args = [
      new Error("failed"),
      { headers: {}, method: "GET", path: "/" },
      {
        routePath: "/",
        routerKind: "App Router",
        routeType: "render",
      },
    ] satisfies Parameters<typeof onRequestError>;

    it("sends the error to Sentry", async () => {
      await onRequestError(...args);

      expect(sentry.captureRequestError).toHaveBeenCalledWith(...args);
    });

    it("does nothing without the DSN", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);

      await onRequestError(...args);

      expect(sentry.captureRequestError).not.toHaveBeenCalled();
    });
  });
});

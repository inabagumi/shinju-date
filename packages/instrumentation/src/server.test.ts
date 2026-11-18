import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRequestError, registerServer } from "./server.js";

const sentry = vi.hoisted(() => ({
  captureRequestError: vi.fn(),
  init: vi.fn(),
}));
const startServer = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => sentry);
vi.mock("@sentry/profiling-node", () => ({
  nodeProfilingIntegration: () => ({ name: "ProfilingIntegration" }),
}));
vi.mock("@supabase/sentry-js-integration", () => ({
  supabaseIntegration: () => ({ name: "SupabaseIntegration" }),
}));
vi.mock("@supabase/supabase-js", () => ({ SupabaseClient: class {} }));
vi.mock("@shinju-date/msw-handlers/server", () => ({ startServer }));

const options = {
  enableMsw: false,
  profileSessionSampleRate: 0.5,
  tracesSampleRate: 0.25,
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@example.com/1");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("VERCEL_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("registerServer", () => {
  it("initializes Sentry for Node.js with the profiler", async () => {
    await registerServer(options);

    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.init).toHaveBeenCalledWith({
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

    expect(sentry.init).toHaveBeenCalledOnce();
    expect(sentry.init).toHaveBeenCalledWith({
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

describe("onRequestError", () => {
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

import type * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initClient, onRouterTransitionStart } from "./client.js";

const sentry = vi.hoisted(() => ({
  browserProfilingIntegration: () => ({ name: "BrowserProfiling" as const }),
  browserTracingIntegration: () => ({ name: "BrowserTracing" as const }),
  captureRouterTransitionStart:
    vi.fn<typeof Sentry.captureRouterTransitionStart>(),
  init: vi.fn<typeof Sentry.init>(),
  replayIntegration: () =>
    ({ name: "Replay" }) as Partial<
      ReturnType<typeof Sentry.replayIntegration>
    > as ReturnType<typeof Sentry.replayIntegration>,
}));

vi.mock(import("@sentry/nextjs"), () => sentry);

const options = {
  profileSessionSampleRate: 0.5,
  replay: { onErrorSampleRate: 1, sessionSampleRate: 0.1 },
  tracesSampleRate: 0.25,
};

describe("client instrumentation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@example.com/1");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_ENV", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe(initClient, () => {
    it("initializes Sentry with the sample rates", async () => {
      initClient(options);

      await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledOnce());
      expect(sentry.init).toHaveBeenCalledWith({
        dsn: "https://key@example.com/1",
        enabled: true,
        environment: "production",
        integrations: [
          { name: "BrowserTracing" },
          { name: "BrowserProfiling" },
          { name: "Replay" },
        ],
        profileLifecycle: "trace",
        profileSessionSampleRate: 0.5,
        replaysOnErrorSampleRate: 1,
        replaysSessionSampleRate: 0.1,
        tracesSampleRate: 0.25,
      });
    });

    it("logs the error when Sentry fails to initialize", async () => {
      const error = new Error("failed");
      sentry.init.mockImplementationOnce(() => {
        throw error;
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockReturnValue(undefined);
      const rejections: unknown[] = [];
      const onRejection = (reason: unknown) => {
        rejections.push(reason);
      };
      process.on("unhandledRejection", onRejection);

      try {
        initClient(options);

        await vi.waitFor(() =>
          expect(consoleError).toHaveBeenCalledWith(
            "Failed to initialize Sentry:",
            error
          )
        );
        await vi.waitFor(() => expect(rejections).toStrictEqual([error]));
      } finally {
        process.off("unhandledRejection", onRejection);
      }
    });

    it("does not initialize Sentry without the DSN", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);

      initClient(options);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sentry.init).not.toHaveBeenCalled();
    });
  });

  describe(onRouterTransitionStart, () => {
    it("starts the trace of the navigation", async () => {
      await onRouterTransitionStart("/videos", "push");

      expect(sentry.captureRouterTransitionStart).toHaveBeenCalledWith(
        "/videos",
        "push"
      );
    });

    it("does nothing without the DSN", async () => {
      vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);

      await onRouterTransitionStart("/videos", "push");

      expect(sentry.captureRouterTransitionStart).not.toHaveBeenCalled();
    });
  });
});

import type { captureRequestError } from "@sentry/nextjs";

export interface RegisterServerOptions {
  /**
   * Starts the MSW mock server on the Node.js runtime. Pass the app's
   * `ENABLE_MSW`, read by its `lib/env.ts`.
   */
  enableMsw: boolean;
  /** The share of the traces whose profile is recorded (`0` to `1`). */
  profileSessionSampleRate: number;
  /** The share of the requests that are traced (`0` to `1`). */
  tracesSampleRate: number;
}

/**
 * The body of `register()` in `instrumentation.ts`. Starts MSW when
 * `enableMsw` is true, and initializes Sentry for the runtime (Node.js or
 * Edge) when `NEXT_PUBLIC_SENTRY_DSN` is set.
 *
 * The checks on `NEXT_RUNTIME` are written out in full, so that Next.js can
 * drop the code of the other runtime when it builds the bundle.
 */
export async function registerServer({
  enableMsw,
  profileSessionSampleRate,
  tracesSampleRate,
}: RegisterServerOptions): Promise<void> {
  if (enableMsw) {
    if (process.env["NEXT_RUNTIME"] === "nodejs") {
      const { startServer } = await import("@shinju-date/msw-handlers/server");
      startServer();
    }
  }

  const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];

  if (!dsn) {
    return;
  }

  const Sentry = await import("@sentry/nextjs");

  const environment = process.env["VERCEL_ENV"] ?? "development";
  const commonSentryOptions = {
    dsn,
    enabled: environment === "production",
    environment,
    tracesSampleRate,
  } satisfies Parameters<typeof Sentry.init>[0];

  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    const [
      { nodeProfilingIntegration },
      { supabaseIntegration },
      { SupabaseClient },
    ] = await Promise.all([
      import("@sentry/profiling-node"),
      import("@supabase/sentry-js-integration"),
      import("@supabase/supabase-js"),
    ]);

    Sentry.init({
      ...commonSentryOptions,
      integrations: [
        nodeProfilingIntegration(),
        supabaseIntegration(SupabaseClient, Sentry, {
          breadcrumbs: true,
          errors: true,
          tracing: true,
        }),
      ],
      profileLifecycle: "trace",
      profileSessionSampleRate,
    });
  }

  if (process.env["NEXT_RUNTIME"] === "edge") {
    const [{ supabaseIntegration }, { SupabaseClient }] = await Promise.all([
      import("@supabase/sentry-js-integration"),
      import("@supabase/supabase-js"),
    ]);

    Sentry.init({
      ...commonSentryOptions,
      integrations: [
        supabaseIntegration(SupabaseClient, Sentry, {
          breadcrumbs: true,
          errors: true,
          tracing: true,
        }),
      ],
    });
  }
}

/**
 * `onRequestError` of `instrumentation.ts`. Sends the error of a request to
 * Sentry when `NEXT_PUBLIC_SENTRY_DSN` is set.
 */
export async function onRequestError(
  ...args: Parameters<typeof captureRequestError>
): Promise<void> {
  const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];

  if (dsn) {
    const Sentry = await import("@sentry/nextjs");

    Sentry.captureRequestError(...args);
  }
}

export interface ReplayOptions {
  /** The share of the sessions with an error that are recorded (`0` to `1`). */
  onErrorSampleRate: number
  /** The share of all the sessions that are recorded (`0` to `1`). */
  sessionSampleRate: number
}

export interface InitClientOptions {
  /** The share of the traces whose profile is recorded (`0` to `1`). */
  profileSessionSampleRate: number
  /** The sample rates of Session Replay. */
  replay: ReplayOptions
  /** The share of the page loads and navigations that are traced (`0` to `1`). */
  tracesSampleRate: number
}

/**
 * Initializes Sentry in the browser when `NEXT_PUBLIC_SENTRY_DSN` is set.
 * Called from `instrumentation-client.ts`.
 *
 * `@sentry/nextjs` is loaded with a dynamic import, so that it does not delay
 * the first render. When it fails to load, the error is logged to the console
 * and thrown again.
 */
export function initClient({
  profileSessionSampleRate,
  replay,
  tracesSampleRate,
}: InitClientOptions): void {
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (!dsn) {
    return
  }

  import('@sentry/nextjs')
    .then((Sentry) => {
      const environment =
        process.env['VERCEL_ENV'] ??
        process.env['NEXT_PUBLIC_VERCEL_ENV'] ??
        'development'

      Sentry.init({
        dsn,
        enabled: environment === 'production',
        environment,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.browserProfilingIntegration(),
          Sentry.replayIntegration(),
        ],
        profileLifecycle: 'trace',
        profileSessionSampleRate,
        replaysOnErrorSampleRate: replay.onErrorSampleRate,
        replaysSessionSampleRate: replay.sessionSampleRate,
        tracesSampleRate,
      })
    })
    .catch((error: unknown) => {
      console.error('Failed to initialize Sentry:', error)
      throw error
    })
}

/**
 * `onRouterTransitionStart` of `instrumentation-client.ts`. Starts the trace
 * of a client-side navigation when `NEXT_PUBLIC_SENTRY_DSN` is set.
 */
export async function onRouterTransitionStart(
  href: string,
  navigationType: string,
): Promise<void> {
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (dsn) {
    const Sentry = await import('@sentry/nextjs')

    Sentry.captureRouterTransitionStart(href, navigationType)
  }
}

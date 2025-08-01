const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

if (dsn) {
  import('@sentry/nextjs')
    .then((Sentry) => {
      const environment =
        process.env['VERCEL_ENV'] ??
        process.env['NEXT_PUBLIC_VERCEL_ENV'] ??
        'development'

      Sentry.init({
        dsn,
        enabled: environment === 'production',
        enableLogs: true,
        environment,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.browserProfilingIntegration(),
          Sentry.replayIntegration(),
        ],
        profilesSampleRate: 1.0,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        sendDefaultPii: true,
        tracesSampleRate: 1.0,
      })
    })
    .catch((error) => {
      throw error
    })
}

export async function onRouterTransitionStart(
  href: string,
  navigationType: string,
) {
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (dsn) {
    const { captureRouterTransitionStart } = await import('@sentry/nextjs')

    captureRouterTransitionStart(href, navigationType)
  }
}

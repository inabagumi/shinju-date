const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

if (dsn) {
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        enabled: process.env['VERCEL_ENV'] === 'production',
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.browserProfilingIntegration(),
          Sentry.replayIntegration()
        ],
        profilesSampleRate: 0.333,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        tracesSampleRate: 0.333
      })
    })
    .catch((error) => {
      throw error
    })
}

export async function onRouterTransitionStart(
  href: string,
  navigationType: string
) {
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (dsn) {
    const { captureRouterTransitionStart } = await import('@sentry/nextjs')

    captureRouterTransitionStart(href, navigationType)
  }
}

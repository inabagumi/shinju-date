import * as Sentry from '@sentry/nextjs'

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env['VERCEL_ENV'] === 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      Sentry.replayIntegration()
    ],
    profilesSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    tracesSampleRate: 1.0
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

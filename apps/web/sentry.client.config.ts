import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.VERCEL_ENV === 'production',
  integrations: [new Sentry.BrowserProfilingIntegration()],
  profilesSampleRate: 1.0,
  tracesSampleRate: 1.0
})

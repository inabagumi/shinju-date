import * as Sentry from '@sentry/nextjs'

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env['VERCEL_ENV'] === 'production',
    tracesSampleRate: 1.0
  })
}

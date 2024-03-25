import * as Sentry from '@sentry/nextjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

if (dsn) {
  Sentry.init({
    dsn,
    enabled: process.env['VERCEL_ENV'] === 'production',
    ignoreErrors: ['AbortError'],
    integrations: [nodeProfilingIntegration()],
    profilesSampleRate: 1.0,
    tracesSampleRate: 1.0
  })
}

import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

export default defineNitroPlugin((_nitroApp) => {
  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (!dsn) {
    console.log('Sentry DSN not found, skipping initialization')
    return
  }

  Sentry.init({
    dsn,
    environment:
      process.env['VERCEL_ENV'] || process.env['NODE_ENV'] || 'development',
    integrations: [nodeProfilingIntegration()],
    profilesSampleRate: 1.0,
    tracesSampleRate: 1.0,
  })

  console.log('Sentry initialized for Nitro')
})

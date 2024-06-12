import { registerOTel } from '@vercel/otel'

export async function register() {
  registerOTel({ serviceName: 'shinju-date-admin' })

  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (dsn) {
    const Sentry = await import('@sentry/nextjs')
    const commonSentryOptions = {
      dsn,
      enabled: process.env['VERCEL_ENV'] === 'production',
      tracesSampleRate: 1.0
    }

    if (process.env['NEXT_RUNTIME'] === 'nodejs') {
      const { nodeProfilingIntegration } = await import(
        '@sentry/profiling-node'
      )

      Sentry.init({
        ...commonSentryOptions,
        integrations: [nodeProfilingIntegration()],
        profilesSampleRate: 1.0
      })
    }

    if (process.env['NEXT_RUNTIME'] === 'edge') {
      Sentry.init({
        ...commonSentryOptions
      })
    }
  }
}

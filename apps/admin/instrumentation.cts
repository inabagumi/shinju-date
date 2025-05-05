import type { Instrumentation } from 'next'

export async function register() {
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

export const onRequestError: Instrumentation.onRequestError =
  async function onRequestError(...args) {
    const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

    if (dsn) {
      const { captureRequestError } = await import('@sentry/nextjs')

      return captureRequestError(...args)
    }
  }

import type { Instrumentation } from 'next'

export async function register() {
  // Initialize MSW when explicitly enabled
  if (process.env['ENABLE_MSW'] === 'true') {
    if (process.env['NEXT_RUNTIME'] === 'nodejs') {
      const { startServer } = await import('@shinju-date/msw-handlers/server')
      startServer()
    }
  }

  const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

  if (dsn) {
    const Sentry = await import('@sentry/nextjs')

    const environment = process.env['VERCEL_ENV'] ?? 'development'
    const commonSentryOptions = {
      dsn,
      enabled: environment === 'production',
      enableLogs: true,
      environment,
      sendDefaultPii: true,
      tracesSampleRate: 0.333,
    } satisfies Parameters<typeof Sentry.init>[0]

    if (process.env['NEXT_RUNTIME'] === 'nodejs') {
      const [
        { nodeProfilingIntegration },
        { supabaseIntegration },
        { SupabaseClient },
      ] = await Promise.all([
        import('@sentry/profiling-node'),
        import('@supabase/sentry-js-integration'),
        import('@supabase/supabase-js'),
      ])

      Sentry.init({
        ...commonSentryOptions,
        integrations: [
          nodeProfilingIntegration(),
          supabaseIntegration(SupabaseClient, Sentry, {
            breadcrumbs: true,
            errors: true,
            tracing: true,
          }),
        ],
        profilesSampleRate: 0.333,
      })
    }

    if (process.env['NEXT_RUNTIME'] === 'edge') {
      const [{ supabaseIntegration }, { SupabaseClient }] = await Promise.all([
        import('@supabase/sentry-js-integration'),
        import('@supabase/supabase-js'),
      ])

      Sentry.init({
        ...commonSentryOptions,
        integrations: [
          supabaseIntegration(SupabaseClient, Sentry, {
            breadcrumbs: true,
            errors: true,
            tracing: true,
          }),
        ],
      })
    }
  }
}

export const onRequestError: Instrumentation.onRequestError =
  async function onRequestError(...args) {
    const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN']

    if (dsn) {
      const Sentry = await import('@sentry/nextjs')

      return Sentry.captureRequestError(...args)
    }
  }

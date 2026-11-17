import { withSentryConfig } from '@sentry/nextjs/config'

/**
 * Wraps the Next.js config with `withSentryConfig` when
 * `NEXT_PUBLIC_SENTRY_DSN` is set, and returns it as it is otherwise.
 *
 * Apply it last, after the other plugins such as `withMDX`.
 */
export function withSentry<C>(nextConfig: C): C {
  if (!process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return nextConfig
  }

  return withSentryConfig(nextConfig, {
    bundleSizeOptimizations: {
      excludeDebugStatements: true,
    },
    reactComponentAnnotation: {
      enabled: true,
    },
    silent: true,
    tunnelRoute: '/monitoring',
    widenClientFileUpload: true,
  })
}

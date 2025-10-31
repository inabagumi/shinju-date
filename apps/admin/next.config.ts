import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const supabaseBaseURL =
  typeof process.env['NEXT_PUBLIC_SUPABASE_URL'] !== 'undefined'
    ? new URL(process.env['NEXT_PUBLIC_SUPABASE_URL'])
    : undefined

const nextConfig: NextConfig = {
  // `'use cache: private'`ディレクティブがstableになったら`cacheComponents`を有効化する
  // cacheComponents: true,
  headers() {
    return Promise.resolve([
      {
        headers: [
          {
            key: 'Document-Policy',
            value: 'js-profiling',
          },
        ],
        source: '/:path*',
      },
    ])
  },
  images: {
    remotePatterns: [
      ...(supabaseBaseURL
        ? [
            {
              hostname: supabaseBaseURL.host,
              pathname: '/storage/v1/object/public/**',
              ...(supabaseBaseURL.protocol === 'https:'
                ? {
                    protocol: 'https' as const,
                  }
                : {}),
            },
          ]
        : []),
    ],
  },
  reactCompiler: true,
  reactStrictMode: true,
  serverExternalPackages: ['@sentry/profiling-node'],
}

function withPlugins(nextConfig: NextConfig): NextConfig {
  if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return withSentryConfig(nextConfig, {
      automaticVercelMonitors: false,
      disableLogger: true,
      reactComponentAnnotation: {
        enabled: true,
      },
      silent: true,
      tunnelRoute: '/monitoring',
      widenClientFileUpload: true,
    })
  }

  return nextConfig
}

export default withPlugins(nextConfig)

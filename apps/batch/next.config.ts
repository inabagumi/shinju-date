import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true
  },
  headers() {
    return Promise.resolve([
      {
        headers: [
          {
            key: 'Document-Policy',
            value: 'js-profiling'
          }
        ],
        source: '/:path*'
      }
    ])
  },
  reactStrictMode: true,
  serverExternalPackages: ['@sentry/profiling-node']
}

function withPlugins(nextConfig: NextConfig): NextConfig {
  if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return withSentryConfig(nextConfig, {
      automaticVercelMonitors: false,
      disableLogger: true,
      reactComponentAnnotation: {
        enabled: true
      },
      silent: true,
      tunnelRoute: '/monitoring',
      widenClientFileUpload: true
    })
  }

  return nextConfig
}

export default withPlugins(nextConfig)

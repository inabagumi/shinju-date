import { withSentry } from '@shinju-date/instrumentation/next-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbopackRustReactCompiler: true,
  },
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
  reactCompiler: true,
  reactStrictMode: true,
  serverExternalPackages: ['@sentry/profiling-node'],
}

export default withSentry(nextConfig)

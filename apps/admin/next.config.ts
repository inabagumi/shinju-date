import { withSentry } from '@shinju-date/instrumentation/next-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
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
  partialPrefetching: true,
  reactCompiler: true,
  reactStrictMode: true,
  serverExternalPackages: [
    '@sentry/profiling-node',
    'msw',
    '@mswjs/interceptors',
  ],
  turbopack: {
    rules: {
      // Compile Tailwind CSS with its Turbopack loader instead of PostCSS.
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
      },
    },
  },
}

export default withSentry(nextConfig)

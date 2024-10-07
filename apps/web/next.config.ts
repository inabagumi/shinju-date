import createMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'
import type { NextConfig } from 'next'

const supabaseBaseURL =
  typeof process.env['NEXT_PUBLIC_SUPABASE_URL'] !== 'undefined'
    ? new URL(process.env['NEXT_PUBLIC_SUPABASE_URL'])
    : undefined

const nextConfig: NextConfig = {
  experimental: {
    dynamicIO: true,
    ppr: true,
    pprFallbacks: true
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
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 365 * 24 * 60 * 60,
    remotePatterns: [
      ...(supabaseBaseURL
        ? [
            {
              hostname: supabaseBaseURL.host,
              pathname: '/storage/v1/object/public/**',
              ...(supabaseBaseURL.protocol === 'https:'
                ? {
                    protocol: 'https' as const
                  }
                : {})
            }
          ]
        : []),
      {
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
        protocol: 'https' as const
      }
    ]
  },
  pageExtensions: ['tsx', 'ts', 'mdx'],
  reactStrictMode: true,
  redirects() {
    return Promise.resolve([
      {
        destination: '/',
        permanent: true,
        source: '/groups/:slug'
      },
      {
        destination: '/videos/:query*',
        permanent: true,
        source: '/groups/:slug/videos/:query*'
      }
    ])
  },
  rewrites() {
    return Promise.resolve({
      afterFiles: [
        {
          destination: '/manifest.webmanifest',
          source: '/manifest.json'
        }
      ],
      beforeFiles: [],
      fallback: []
    })
  },
  serverExternalPackages: ['@sentry/profiling-node']
}

const withMDX = createMDX({
  options: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          rel: ['noopener', 'noreferrer'],
          target: '_blank'
        }
      ]
    ],
    remarkPlugins: [remarkGfm]
  }
})

function withPlugins(nextConfig: NextConfig): NextConfig {
  if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return withSentryConfig(withMDX(nextConfig), {
      automaticVercelMonitors: false,
      hideSourceMaps: true,
      silent: true,
      tunnelRoute: '/api/monitoring/sentry'
    })
  }

  return withMDX(nextConfig)
}

export default withPlugins(nextConfig)

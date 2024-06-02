// @ts-check

import createMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import { isNonNullable } from '@shinju-date/helpers'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'

const supabaseBaseURL =
  typeof process.env['NEXT_PUBLIC_SUPABASE_URL'] !== 'undefined'
    ? new URL(process.env['NEXT_PUBLIC_SUPABASE_URL'])
    : undefined

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    ppr: true,
    serverComponentsExternalPackages: ['@sentry/profiling-node']
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 365 * 24 * 60 * 60,
    remotePatterns: [
      supabaseBaseURL && {
        hostname: supabaseBaseURL.host,
        pathname: '/storage/v1/object/public/**',
        /** @type {'http' | 'https' | undefined} */
        protocol: supabaseBaseURL.protocol === 'https:' ? 'https' : undefined
      },
      {
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
        /** @type {'http' | 'https' | undefined} */
        protocol: 'https'
      }
    ].filter(isNonNullable)
  },
  pageExtensions: ['tsx', 'ts', 'mdx'],
  reactStrictMode: true,
  async redirects() {
    return [
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
    ]
  },
  async rewrites() {
    return {
      afterFiles: [
        {
          destination: '/manifest.webmanifest',
          source: '/manifest.json'
        }
      ],
      beforeFiles: [],
      fallback: []
    }
  }
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

/**
 * @param {import('next').NextConfig} nextConfig
 * @returns {import('next').NextConfig}
 */
function withPlugins(nextConfig) {
  if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return withSentryConfig(withMDX(nextConfig), {
      automaticVercelMonitors: true,
      hideSourceMaps: true,
      silent: true,
      tunnelRoute: '/api/monitoring/sentry'
    })
  }

  return withMDX(nextConfig)
}

export default withPlugins(nextConfig)

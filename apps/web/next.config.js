// @ts-check

import createMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
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
    mdxRs: true,
    serverComponentsExternalPackages: ['@sentry/profiling-node']
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
              protocol: undefined
            }
          ]
        : []),
      {
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
        protocol: 'https'
      }
    ]
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
        destination: '/videos/:queries*',
        permanent: true,
        source: '/groups/:slug/videos/:queries*'
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

export default withSentryConfig(
  withMDX(nextConfig),
  {},
  {
    automaticVercelMonitors: true,
    hideSourceMaps: true,
    tunnelRoute: '/api/monitoring/sentry'
  }
)

import nextMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import nextPWA from 'next-pwa'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'

const supabaseBaseURL =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 365 * 24 * 60 * 60,
    remotePatterns: [
      {
        hostname: supabaseBaseURL?.host,
        pathname: '/storage/v1/object/public/**',
        protocol: supabaseBaseURL?.protocol.slice(0, -1)
      }
    ]
  },
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
          destination: '/_next/static/service-worker.js',
          source: '/service-worker.js'
        },
        {
          destination: '/_next/static/workbox-:hash.js',
          source: '/workbox-:hash.js'
        },
        {
          destination: '/manifest.webmanifest',
          source: '/manifest.json'
        }
      ]
    }
  }
}

const withPWA = nextPWA({
  buildExcludes: [/app-build-manifest\.json$/],
  dest: '.next/static',
  disable: process.env.NODE_ENV === 'development',
  sw: 'service-worker.js'
})

const withMDX = nextMDX({
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

export default withSentryConfig(withPWA(withMDX(nextConfig)), { silent: true })

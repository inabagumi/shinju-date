import nextMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import nextPWA from 'next-pwa'
import { fileURLToPath } from 'node:url'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'

const supabaseBaseURL =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
    outputFileTracingExcludes: {
      '*': [
        './**/node_modules/@swc/core-linux-x64-gnu',
        './**/node_modules/@swc/core-linux-x64-musl',
        './**/node_modules/@esbuild/linux-x64',
        './**/node_modules/webpack',
        './**/node_modules/terser'
      ]
    },
    outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url))
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
        },
        // deprecated
        {
          destination: '/videos.ics',
          source: '/calendar.ics'
        },
        // deprecated
        {
          destination: '/channels/:id/videos.ics',
          source: '/calendar/:id.ics'
        }
      ]
    }
  },
  webpack(config, { defaultLoaders }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        defaultLoaders.babel,
        {
          loader: '@svgr/webpack',
          options: {
            babel: false,
            dimensions: false
          }
        }
      ]
    })

    return config
  }
}

const withPWA = nextPWA({
  buildExcludes: [/app-build-manifest\.json$/],
  dest: '.next/static',
  disable: process.env.NODE_ENV === 'development',
  publicExcludes: ['!404.png', '!opensearch.xml'],
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

export default withSentryConfig(
  withPWA(withMDX(nextConfig)),
  { silent: true },
  { hideSourceMaps: true }
)

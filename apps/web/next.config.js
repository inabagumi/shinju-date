import nextMDX from '@next/mdx'
import nextPWA from 'next-pwa'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    mdxRs: true
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 365 * 24 * 60 * 60,
    remotePatterns: [
      {
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
        protocol: 'https'
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
  transpilePackages: ['@shinju-date/polyfills', '@shinju-date/schema'],
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

export default withPWA(withMDX(nextConfig))

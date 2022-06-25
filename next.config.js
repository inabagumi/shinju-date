import nextMDX from '@next/mdx'
import withPWA from 'next-pwa'
import rehypeExternalLinks from 'rehype-external-links'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    browsersListForSwc: true,
    legacyBrowsers: false,
    newNextLinkBehavior: true,
    optimizeCss: true,
    runtime: 'edge'
  },
  images: {
    domains: ['i.ytimg.com'],
    formats: ['image/avif', 'image/webp']
  },
  pageExtensions: ['mdx', 'ts', 'tsx'],
  pwa: {
    buildExcludes: [
      /\/_middlewareManifest\.js$/,
      /\/_middleware\.js$/,
      /\/middleware-manifest\.json$/,
      /\/middleware-chunks\/[^.]+\.js$/,
      /\/webpack-middleware-[^.]+\.js$/
    ],
    dest: '.next/static',
    disable: process.env.NODE_ENV === 'development',
    sw: 'service-worker.js'
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
          destination: '/api/manifest',
          source: '/manifest.json'
        },
        // deprecated
        {
          destination: '/api/calendar',
          source: '/calendar.ics'
        },
        {
          destination: '/api/calendar',
          source: '/videos.ics'
        },
        // deprecated
        {
          destination: '/api/calendar/:id',
          source: '/calendar/:id.ics'
        },
        {
          destination: '/api/calendar/:id',
          source: '/channels/:id/videos.ics'
        },
        {
          destination: '/api/search',
          source: '/search'
        }
      ]
    }
  },
  swcMinify: true,
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

const withMDX = nextMDX({
  options: {
    jsx: true,
    providerImportSource: '@mdx-js/react',
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          rel: ['noopener', 'noreferrer']
        }
      ]
    ],
    remarkPlugins: [remarkGfm]
  }
})

export default withPWA(withMDX(nextConfig))

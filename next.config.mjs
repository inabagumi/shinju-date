import withPWA from 'next-pwa'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: true
  },
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja']
  },
  images: {
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    domains: [],
    formats: [
      process.env.NODE_ENV === 'production' && 'image/avif',
      'image/webp'
    ].filter(Boolean),
    ...(process.env.IMGIX_BASE_PATH
      ? {
          loader: 'imgix',
          path: process.env.IMGIX_BASE_PATH
        }
      : {})
  },
  pageExtensions: ['mdx', 'ts', 'tsx'],
  pwa: {
    dest: '.next/static',
    disable: process.env.NODE_ENV === 'development',
    sw: 'service-worker.js'
  },
  reactStrictMode: true,
  async redirects() {
    return [
      {
        destination: '/videos',
        permanent: true,
        source: '/search'
      }
    ]
  },
  async rewrites() {
    return [
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
      {
        destination: 'https://i.ytimg.com/vi/:id/maxresdefault.jpg',
        source: '/images/youtube/:id.jpg'
      },
      {
        destination: 'https://i.ytimg.com/vi/:id/:filename.jpg',
        source: '/images/youtube/:id/:filename.jpg'
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
      }
    ]
  },
  swcMinify: true,
  webpack(config, { defaultLoaders }) {
    config.module.rules.push({
      test: /\.mdx?$/,
      use: [
        defaultLoaders.babel,
        {
          loader: '@mdx-js/loader',
          /** @type {import('@mdx-js/loader').Options} */
          options: {
            jsx: true,
            providerImportSource: '@mdx-js/react',
            remarkPlugins: [remarkGfm]
          }
        }
      ]
    })

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

export default withPWA(nextConfig)

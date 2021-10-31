import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['components', 'pages', 'types', 'utils']
  },
  experimental: {
    optimizeCss: true
  },
  images: {
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    domains: [],
    formats: ['image/avif', 'image/webp'],
    ...(process.env.IMGIX_BASE_PATH
      ? {
          loader: 'imgix',
          path: process.env.IMGIX_BASE_PATH
        }
      : {})
  },
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja']
  },
  pageExtensions: ['mdx', 'ts', 'tsx'],
  pwa: {
    dest: '.next/static',
    disable: process.env.NODE_ENV === 'development',
    sw: 'service-worker.js'
  },
  reactStrictMode: true,
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
        destination: 'https://i.ytimg.com/vi/:id/:name.jpg',
        source: '/images/youtube/:id/:name.jpg'
      },
      {
        destination: '/api/calendar',
        source: '/calendar.ics'
      },
      {
        destination: '/api/calendar/:id',
        source: '/calendar/:id.ics'
      }
    ]
  },
  webpack(config, { defaultLoaders }) {
    config.module.rules.push({
      test: /\.mdx?$/,
      use: [
        defaultLoaders.babel,
        {
          loader: '@mdx-js/loader',
          /** @type {import('@mdx-js/loader').Options} */
          options: {}
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

const withMDX = require('@next/mdx')
const withOffline = require('next-offline')

require('dotenv').config()

const nextConfig = {
  env: {
    GA_TRACKING_ID: process.env.GA_TRACKING_ID
  },
  experimental: {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    headers: () => [
      {
        headers: [
          {
            key: 'cache-control',
            value: 'max-age=300, s-maxage=60'
          },
          {
            key: 'content-security-policy',
            value:
              "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://shinju-date.imgix.net https://storage.googleapis.com; default-src 'self'; font-src https://fonts.gstatic.com; img-src 'self' data: https://shinju-date.imgix.net; manifest-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://storage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; worker-src 'self'"
          }
        ],
        source: '/((?!_next).*)'
      },
      {
        headers: [
          {
            key: 'cache-control',
            value: 'max-age=0'
          }
        ],
        source: '/service-worker.js'
      }
    ],
    optionalCatchAll: true,
    pageEnv: true,
    plugins: true,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    rewrites: () => [
      {
        destination: '/_next/static/service-worker.js',
        source: '/service-worker.js'
      },
      {
        destination: '/api/manifest',
        source: '/manifest.json'
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
  pageExtensions: ['mdx', 'ts', 'tsx'],
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  webpack(config, { defaultLoaders, dev }) {
    config.module.rules.push({
      test: /\.(?:jpe?g|png)$/,
      use: [
        defaultLoaders.babel,
        {
          loader: 'url-loader',
          options: {
            limit: 2048,
            name: dev
              ? '[name].[ext]?[contenthash:8]'
              : '[name].[contenthash:8].[ext]',
            outputPath: 'static/media',
            publicPath: '/_next/static/media'
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
  },
  workboxOpts: {
    clientsClaim: true,
    runtimeCaching: [
      {
        handler: 'CacheFirst',
        urlPattern: /^\/(?:about|privacy|search|terms)$/
      },
      {
        handler: 'NetworkFirst',
        urlPattern: /\.(ico|png)$/i
      },
      {
        handler: 'CacheFirst',
        options: {
          cacheableResponse: {
            statuses: [200]
          }
        },
        urlPattern: /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|shinju-date\.imgix\.net)\//i
      }
    ],
    skipWaiting: true,
    swDest: 'static/service-worker.js'
  }
}

module.exports = withOffline(withMDX()(nextConfig))

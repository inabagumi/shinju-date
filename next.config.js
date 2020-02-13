const withMDX = require('@next/mdx')
const withOffline = require('next-offline')

require('dotenv').config()

const nextConfig = {
  cssLoaderOptions: {
    url: false
  },
  env: {
    ALGOLIA_API_KEY: process.env.ALGOLIA_API_KEY,
    ALGOLIA_APPLICATION_ID: process.env.ALGOLIA_APPLICATION_ID,
    ALGOLIA_INDEX_NAME: process.env.ALGOLIA_INDEX_NAME,
    SHINJU_DATE_BASE_URL: process.env.SHINJU_DATE_BASE_URL,
    SHINJU_DATE_DESCRIPTION: process.env.SHINJU_DATE_DESCRIPTION,
    SHINJU_DATE_TITLE: process.env.SHINJU_DATE_TITLE
  },
  experimental: {
    rewrites: () => [
      {
        destination: '/search',
        source: '/'
      },
      {
        destination: '/_next/static/service-worker.js',
        source: '/service-worker.js'
      }
    ]
  },
  pageExtensions: ['mdx', 'tsx'],
  target: 'serverless',
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
        urlPattern: /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|i\.ytimg\.com)\//i
      }
    ],
    skipWaiting: true,
    swDest: 'static/service-worker.js'
  }
}

module.exports = withOffline(withMDX()(nextConfig))

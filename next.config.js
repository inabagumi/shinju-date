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
    ALGOLIA_INDEX_NAME: process.env.ALGOLIA_INDEX_NAME
  },
  experimental: {
    pageEnv: true,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    rewrites: () => [
      {
        destination: '/_next/static/service-worker.js',
        source: '/service-worker.js'
      }
    ]
  },
  pageExtensions: ['mdx', 'ts', 'tsx'],
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

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
    ANIMARE_SEARCH_BASE_URL: process.env.ANIMARE_SEARCH_BASE_URL,
    ANIMARE_SEARCH_DESCRIPTION: process.env.ANIMARE_SEARCH_DESCRIPTION,
    ANIMARE_SEARCH_TITLE: process.env.ANIMARE_SEARCH_TITLE
  },
  experimental: {
    css: true
  },
  pageExtensions: ['mdx', 'tsx'],
  target: 'serverless',
  transformManifest: manifest => ['/'].concat(manifest),
  workboxOpts: {
    clientsClaim: true,
    runtimeCaching: [
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

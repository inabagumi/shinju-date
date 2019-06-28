const withTypescript = require('@zeit/next-typescript')
const withOffline = require('next-offline')

module.exports = withTypescript(
  withOffline({
    env: {
      ALGOLIA_API_KEY: process.env.ALGOLIA_API_KEY,
      ALGOLIA_APPLICATION_ID: process.env.ALGOLIA_APPLICATION_ID,
      ALGOLIA_INDEX_NAME: process.env.ALGOLIA_INDEX_NAME,
      ANIMARE_SEARCH_BASE_URL: process.env.ANIMARE_SEARCH_BASE_URL,
      ANIMARE_SEARCH_DESCRIPTION: process.env.ANIMARE_SEARCH_DESCRIPTION,
      ANIMARE_SEARCH_TITLE: process.env.ANIMARE_SEARCH_TITLE
    },
    target: 'serverless',
    workboxOpts: {
      clientsClaim: true,
      importWorkboxFrom: 'local',
      runtimeCaching: [
        {
          handler: 'NetworkFirst',
          urlPattern: /\.(ico|png)$/i
        },
        {
          handler: 'CacheFirst',
          options: {
            cacheableResponse: {
              statuses: [0, 200]
            }
          },
          urlPattern: /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|i\.ytimg\.com|polyfill\.io)\//i
        }
      ],
      skipWaiting: true,
      swDest: 'static/service-worker.js'
    }
  })
)

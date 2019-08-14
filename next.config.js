const withMDX = require('@next/mdx')
const withCSS = require('@zeit/next-css')
const withOffline = require('next-offline')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')

module.exports = withOffline(
  withCSS(
    withMDX()({
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
      pageExtensions: ['mdx', 'tsx'],
      target: 'serverless',
      webpack(config) {
        if (config.optimization.minimizer) {
          config.optimization.minimizer.push(new OptimizeCssAssetsPlugin())
        }

        return config
      },
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
            urlPattern: /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|i\.ytimg\.com|polyfill\.io)\//i
          }
        ],
        skipWaiting: true,
        swDest: 'static/service-worker.js'
      }
    })
  )
)

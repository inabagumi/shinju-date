const withMDX = require('@next/mdx')
const withOffline = require('next-offline')

require('dotenv').config()

const nextConfig = {
  cssLoaderOptions: {
    url: false
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
              "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://i.ytimg.com https://storage.googleapis.com; default-src 'self'; font-src https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com; manifest-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://storage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; worker-src 'self'"
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
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
        urlPattern: /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|i\.ytimg\.com)\//i
      }
    ],
    skipWaiting: true,
    swDest: 'static/service-worker.js'
  }
}

module.exports = withOffline(withMDX()(nextConfig))

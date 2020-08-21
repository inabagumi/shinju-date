const cspBuilder = require('content-security-policy-builder')

const withMDX = require('@next/mdx')()
const withOffline = require('next-offline')

const nextConfig = {
  env: {
    GA_TRACKING_ID: process.env.GA_TRACKING_ID
  },
  experimental: {
    optimizeFonts: true,
    optimizeImages: true,
    plugins: true,
    scrollRestoration: true
  },
  headers: () => [
    {
      headers: [
        {
          key: 'cache-control',
          value: 'max-age=300, s-maxage=60'
        },
        {
          key: 'content-security-policy',
          value: cspBuilder({
            directives: {
              connectSrc: [
                "'self'",
                'https://fonts.googleapis.com',
                'https://fonts.gstatic.com',
                'https://storage.googleapis.com',
                'https://www.google-analytics.com',
                process.env.IMGIX_DOMAIN &&
                  `https://${process.env.IMGIX_DOMAIN}`
              ].filter(Boolean),
              defaultSrc: ["'self'"],
              fontSrc: ['https://fonts.gstatic.com'],
              imgSrc: [
                "'self'",
                'data:',
                'https://www.google-analytics.com',
                'https://www.googletagmanager.com',
                process.env.IMGIX_DOMAIN &&
                  `https://${process.env.IMGIX_DOMAIN}`
              ].filter(Boolean),
              manifestSrc: ["'self'"],
              scriptSrc: [
                "'self'",
                "'unsafe-eval'",
                "'unsafe-inline'",
                'https://storage.googleapis.com',
                'https://www.google-analytics.com',
                'https://www.googletagmanager.com'
              ],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com'
              ],
              workerSrc: ["'self'"]
            }
          })
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
  pageExtensions: ['mdx', 'ts', 'tsx'],
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
  ],
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

module.exports = withOffline(withMDX(nextConfig))

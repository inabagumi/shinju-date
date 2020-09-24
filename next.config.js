const cspBuilder = require('content-security-policy-builder')

const MDX_RENDERER = `
import { mdx } from '@mdx-js/react'

/** @jsxRuntime classic */
`

const withMDX = require('@next/mdx')({
  options: {
    renderer: MDX_RENDERER
  }
})
const withPWA = require('next-pwa')

const nextConfig = {
  env: {
    NEXT_PUBLIC_GA_TRACKING_ID: process.env.NEXT_PUBLIC_GA_TRACKING_ID
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
                'https://www.googletagmanager.com',
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
  pwa: {
    dest: '.next/static',
    disable: process.env.NODE_ENV === 'development',
    sw: '/service-worker.js'
  },
  rewrites: () => [
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
  }
}

module.exports = withPWA(withMDX(nextConfig))

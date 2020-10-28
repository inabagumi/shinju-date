const withMDX = require('@next/mdx')()
const withPWA = require('next-pwa')

const nextConfig = {
  images: {
    deviceSizes: [320, 420, 768, 1024, 1200, 1920],
    domains: ['i.ytimg.com']
  },
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

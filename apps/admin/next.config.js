// @ts-check

import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['@sentry/profiling-node']
  },
  reactStrictMode: true
}

/**
 * @param {import('next').NextConfig} nextConfig
 * @returns {import('next').NextConfig}
 */
function withPlugins(nextConfig) {
  if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return withSentryConfig(nextConfig, {
      automaticVercelMonitors: true,
      hideSourceMaps: true,
      silent: true,
      tunnelRoute: '/api/monitoring/sentry'
    })
  }

  return nextConfig
}

export default withPlugins(nextConfig)

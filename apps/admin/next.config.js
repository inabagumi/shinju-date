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

export default withSentryConfig(
  nextConfig,
  {},
  {
    automaticVercelMonitors: true,
    hideSourceMaps: true,
    tunnelRoute: '/api/monitoring/sentry'
  }
)

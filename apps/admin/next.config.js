import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
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

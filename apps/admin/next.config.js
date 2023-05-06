import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
}

export default withSentryConfig(nextConfig, {
  silent: true
})

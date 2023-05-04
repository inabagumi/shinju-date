import { withSentryConfig } from '@sentry/nextjs'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        './**/node_modules/@swc/core-linux-x64-gnu',
        './**/node_modules/@swc/core-linux-x64-musl',
        './**/node_modules/@esbuild/linux-x64',
        './**/node_modules/webpack',
        './**/node_modules/terser'
      ]
    },
    outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url))
  }
}

export default withSentryConfig(
  nextConfig,
  {
    silent: true
  },
  {
    hideSourceMaps: true
  }
)

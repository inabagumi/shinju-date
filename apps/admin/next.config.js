import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
    serverComponentsExternalPackages: ['imagescript'],
    typedRoutes: true
  }
}

export default nextConfig

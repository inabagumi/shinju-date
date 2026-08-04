import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    turbopackRustReactCompiler: true,
  },
  reactCompiler: true,
  reactStrictMode: true,
}

export default nextConfig

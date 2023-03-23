/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['imagescript'],
    typedRoutes: true
  }
}

export default nextConfig

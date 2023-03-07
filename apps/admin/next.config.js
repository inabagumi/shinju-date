/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true
  },
  transpilePackages: [
    '@shinju-date/chakra-theme',
    '@shinju-date/chakra-ui',
    '@shinju-date/schema'
  ]
}

export default nextConfig

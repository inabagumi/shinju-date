import createMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import { withBotId } from 'botid/next/config'
// import rehypeExternalLinks from 'rehype-external-links'
// import remarkGfm from 'remark-gfm'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    turbopackRustReactCompiler: true,
  },
  headers() {
    return Promise.resolve([
      {
        headers: [
          {
            key: 'Content-Security-Policy',
            // BotID serves challenge/proxy scripts via same-origin rewrites
            // (withBotId), so connect-src/script-src 'self' is sufficient.
            value: [
              "base-uri 'none'",
              "connect-src 'self'",
              "default-src 'none'",
              "font-src 'self'",
              "form-action 'none'",
              "frame-ancestors 'none'",
              "img-src 'self' data:",
              "manifest-src 'self'",
              "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          {
            key: 'Document-Policy',
            value: 'js-profiling',
          },
        ],
        source: '/:path*',
      },
    ])
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 365 * 24 * 60 * 60,
    remotePatterns: [
      {
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
        protocol: 'https' as const,
      },
    ],
  },
  pageExtensions: ['tsx', 'ts', 'mdx'],
  reactCompiler: true,
  reactStrictMode: true,
  serverExternalPackages: [
    '@sentry/profiling-node',
    'msw',
    '@mswjs/interceptors',
  ],
}

const withMDX = createMDX({
  options: {
    rehypePlugins: [
      [
        'rehype-external-links',
        {
          rel: ['noopener', 'noreferrer'],
          target: '_blank',
        },
      ],
    ],
    remarkPlugins: [['remark-gfm', {}]],
  },
})

function withPlugins(config: NextConfig): NextConfig {
  // Apply BotID rewrites before other plugins so challenge/proxy routes are
  // always registered.
  const configWithBotId = withBotId(config)

  if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
    return withSentryConfig(withMDX(configWithBotId), {
      automaticVercelMonitors: false,
      disableLogger: true,
      reactComponentAnnotation: {
        enabled: true,
      },
      silent: true,
      tunnelRoute: '/monitoring',
      widenClientFileUpload: true,
    })
  }

  return withMDX(configWithBotId)
}

export default withPlugins(nextConfig)

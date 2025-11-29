/**
 * MSW Adapter for Next.js
 *
 * This adapter enables MSW (Mock Service Worker) during Next.js build and development.
 * It configures the Node.js runtime to load MSW before any application code.
 *
 * Usage in next.config.ts:
 * ```typescript
 * import type { NextConfig } from 'next'
 *
 * const nextConfig: NextConfig = {
 *   experimental: {
 *     adapterPath: require.resolve('@shinju-date/msw-handlers/adapter'),
 *   },
 * }
 *
 * export default nextConfig
 * ```
 *
 * Then just set ENABLE_MSW=true and build/dev normally:
 * ```bash
 * ENABLE_MSW=true pnpm run build
 * ENABLE_MSW=true pnpm run dev
 * ```
 */

interface NextAdapter {
  name: string
  modifyConfig?: (
    config: any,
    ctx: {
      phase: string
    },
  ) => Promise<any> | any
  onBuildComplete?: (ctx: any) => Promise<void> | void
}

/**
 * MSW adapter for Next.js
 * Configures NODE_OPTIONS to load MSW before application code in all processes
 */
const mswAdapter: NextAdapter = {
  modifyConfig(config) {
    // Only enable MSW if explicitly requested
    if (process.env['ENABLE_MSW'] !== 'true') {
      return config
    }

    // Set up NODE_OPTIONS for worker threads and child processes
    const existingNodeOptions = process.env['NODE_OPTIONS'] || ''
    const mswImport = '--import @shinju-date/msw-handlers/register'

    if (!existingNodeOptions.includes(mswImport)) {
      process.env['NODE_OPTIONS'] = existingNodeOptions
        ? `${existingNodeOptions} ${mswImport}`
        : mswImport

      console.log('🎭 MSW adapter: Configured NODE_OPTIONS for build/dev')
    }

    return config
  },
  name: 'msw-adapter',
}

export default mswAdapter

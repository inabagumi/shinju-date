/**
 * MSW Next.js Config Helper
 *
 * This helper provides a simpler way to enable MSW in Next.js applications
 * without requiring NODE_OPTIONS environment variable.
 *
 * Usage in next.config.ts:
 * ```ts
 * import { withMSW } from '@shinju-date/msw-handlers/next-config'
 *
 * const nextConfig: NextConfig = {
 *   // your config
 * }
 *
 * export default withMSW(nextConfig)
 * ```
 *
 * Or with other wrappers:
 * ```ts
 * export default withMSW(withSentry(withMDX(nextConfig)))
 * ```
 */

// biome-ignore lint/suspicious/noExplicitAny: NextConfig types may not be available at build time
type NextConfig = any

/**
 * Wraps Next.js config to enable MSW when ENABLE_MSW=true
 *
 * This automatically sets up the NODE_OPTIONS environment variable
 * for child processes, making MSW work during build and dev.
 */
export function withMSW(config: NextConfig = {}): NextConfig {
  // Only enable MSW if explicitly requested
  if (process.env['ENABLE_MSW'] !== 'true') {
    return config
  }

  // Set up NODE_OPTIONS for child processes (worker threads)
  // This ensures MSW is loaded before any application code
  const existingNodeOptions = process.env['NODE_OPTIONS'] || ''
  const mswImport = '--import @shinju-date/msw-handlers/register'

  if (!existingNodeOptions.includes(mswImport)) {
    process.env['NODE_OPTIONS'] = existingNodeOptions
      ? `${existingNodeOptions} ${mswImport}`
      : mswImport

    console.log('🎭 MSW enabled for Next.js build/dev')
  }

  return {
    ...config,
    // Ensure webpack config doesn't conflict
    // biome-ignore lint/suspicious/noExplicitAny: Webpack config types vary
    webpack: (webpackConfig: any, context: any) => {
      // Call user's webpack config if provided
      if (typeof config.webpack === 'function') {
        return config.webpack(webpackConfig, context)
      }
      return webpackConfig
    },
  }
}

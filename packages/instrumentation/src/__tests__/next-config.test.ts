import { afterEach, describe, expect, test, vi } from 'vitest'
import { withSentry } from '../next-config.js'

const withSentryConfig = vi.hoisted(() =>
  vi.fn((config: object) => ({ ...config, wrapped: true })),
)

vi.mock('@sentry/nextjs/config', () => ({ withSentryConfig }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('withSentry', () => {
  test('wraps the config with withSentryConfig when the DSN is set', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@example.com/1')

    expect(withSentry({ reactStrictMode: true })).toEqual({
      reactStrictMode: true,
      wrapped: true,
    })
    expect(withSentryConfig).toHaveBeenCalledWith(
      { reactStrictMode: true },
      {
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
        },
        reactComponentAnnotation: {
          enabled: true,
        },
        silent: true,
        tunnelRoute: '/monitoring',
        widenClientFileUpload: true,
      },
    )
  })

  test('leaves out the options for the browser bundle without browser', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@example.com/1')

    withSentry({ reactStrictMode: true }, { browser: false })

    expect(withSentryConfig).toHaveBeenCalledWith(
      { reactStrictMode: true },
      {
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
        },
        silent: true,
      },
    )
  })

  test('returns the config as it is without the DSN', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined)
    const config = { reactStrictMode: true }

    expect(withSentry(config)).toBe(config)
    expect(withSentryConfig).not.toHaveBeenCalled()
  })
})

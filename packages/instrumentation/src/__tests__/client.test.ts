import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { initClient, onRouterTransitionStart } from '../client.js'

const sentry = vi.hoisted(() => ({
  browserProfilingIntegration: () => ({ name: 'BrowserProfiling' }),
  browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
  captureRouterTransitionStart: vi.fn(),
  init: vi.fn(),
  replayIntegration: () => ({ name: 'Replay' }),
}))

vi.mock('@sentry/nextjs', () => sentry)

const options = {
  profileSessionSampleRate: 0.5,
  replay: { onErrorSampleRate: 1, sessionSampleRate: 0.1 },
  tracesSampleRate: 0.25,
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@example.com/1')
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production')
  vi.stubEnv('VERCEL_ENV', undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('initClient', () => {
  test('initializes Sentry with the sample rates', async () => {
    initClient(options)

    await vi.waitFor(() => expect(sentry.init).toHaveBeenCalledOnce())
    expect(sentry.init).toHaveBeenCalledWith({
      dsn: 'https://key@example.com/1',
      enabled: true,
      environment: 'production',
      integrations: [
        { name: 'BrowserTracing' },
        { name: 'BrowserProfiling' },
        { name: 'Replay' },
      ],
      profileLifecycle: 'trace',
      profileSessionSampleRate: 0.5,
      replaysOnErrorSampleRate: 1,
      replaysSessionSampleRate: 0.1,
      tracesSampleRate: 0.25,
    })
  })

  test('logs the error when Sentry fails to initialize', async () => {
    const error = new Error('failed')
    sentry.init.mockImplementationOnce(() => {
      throw error
    })
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => {
      rejections.push(reason)
    }
    process.on('unhandledRejection', onRejection)

    try {
      initClient(options)

      await vi.waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to initialize Sentry:',
          error,
        ),
      )
      await vi.waitFor(() => expect(rejections).toEqual([error]))
    } finally {
      process.off('unhandledRejection', onRejection)
    }
  })

  test('does not initialize Sentry without the DSN', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined)

    initClient(options)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(sentry.init).not.toHaveBeenCalled()
  })
})

describe('onRouterTransitionStart', () => {
  test('starts the trace of the navigation', async () => {
    await onRouterTransitionStart('/videos', 'push')

    expect(sentry.captureRouterTransitionStart).toHaveBeenCalledWith(
      '/videos',
      'push',
    )
  })

  test('does nothing without the DSN', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined)

    await onRouterTransitionStart('/videos', 'push')

    expect(sentry.captureRouterTransitionStart).not.toHaveBeenCalled()
  })
})

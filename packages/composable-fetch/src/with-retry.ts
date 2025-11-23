import pRetry, { AbortError } from 'p-retry'

import type { FetchMiddleware } from './types.js'

/**
 * Options for the retry middleware
 */
export type RetryMiddlewareOptions = {
  /**
   * Whether to abort retry on 404 responses
   * @default true
   */
  abortOn404?: boolean

  /**
   * Maximum number of retry attempts
   * @default 5
   */
  retries?: number
}

/**
 * Middleware that adds automatic retry logic to fetch requests
 *
 * Features:
 * - Retries failed requests up to a configurable number of times
 * - Aborts retry on 404 responses by default
 * - Does not retry on 304 Not Modified responses
 * - Consumes response body on error to reuse socket (Node.js optimization)
 *
 * @example
 * ```typescript
 * const retryFetch = composeFetch(
 *   withRetry(fetch, { retries: 3 })
 * )
 *
 * const response = await retryFetch('https://api.example.com/data')
 * ```
 */
export const withRetry: FetchMiddleware<RetryMiddlewareOptions> = (
  next,
  options = {},
) => {
  const { retries = 5, abortOn404 = true } = options

  return (input, init) => {
    return pRetry<Response>(
      async () => {
        const res = await next(input, init)

        // Don't retry on successful responses or 304 Not Modified
        if (!res.ok && res.status !== 304) {
          // The body is read to reuse the socket.
          // see https://github.com/nodejs/undici/issues/1203#issuecomment-1398191693
          await res.arrayBuffer()

          // Abort retry on 404 if configured
          if (abortOn404 && res.status === 404) {
            throw new AbortError(res.statusText)
          }

          throw new Error(res.statusText)
        }

        return res
      },
      {
        retries,
      },
    )
  }
}

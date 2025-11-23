/**
 * Type definition for the native fetch function
 */
export type FetchFunction = typeof fetch

/**
 * Options for a fetch middleware
 * Middlewares can accept their own configuration options
 */
export type MiddlewareOptions = Record<string, unknown>

/**
 * A middleware function that wraps fetch calls
 * @param next - The next fetch function in the chain (or native fetch)
 * @param options - Optional configuration for the middleware
 * @returns A wrapped fetch function
 */
export type FetchMiddleware<
  TOptions extends MiddlewareOptions = MiddlewareOptions,
> = (next: FetchFunction, options?: TOptions) => FetchFunction

/**
 * Composes multiple fetch middlewares into a single fetch function
 * Middlewares are applied from left to right (first middleware is outermost)
 *
 * @example
 * ```typescript
 * const enhancedFetch = composeFetch(
 *   withRetry,
 *   withCache
 * )
 *
 * const response = await enhancedFetch('https://api.example.com/data')
 * ```
 *
 * @param middlewares - Middleware functions to compose
 * @returns A composed fetch function
 */
export function composeFetch(
  ...middlewares: Array<FetchMiddleware<MiddlewareOptions>>
): FetchFunction {
  return middlewares.reduceRight<FetchFunction>(
    (next, middleware) => middleware(next),
    fetch,
  )
}

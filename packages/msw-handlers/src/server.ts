import { setupServer } from 'msw/node'
import { allHandlers } from './index.js'

/**
 * Mock server for Node.js environments (testing, batch processing, etc.)
 *
 * Usage:
 * ```ts
 * import { server } from '@shinju-date/msw-handlers/server'
 *
 * // Start mocking in tests
 * beforeAll(() => server.listen())
 * afterEach(() => server.resetHandlers())
 * afterAll(() => server.close())
 * ```
 */
export const server = setupServer(...allHandlers)

/**
 * Helper function to start the server with logging
 */
export function startServer() {
  server.listen({
    onUnhandledRequest(request, print) {
      // Log all unhandled requests for debugging
      const url = new URL(request.url)

      // Only warn about actual application requests, not localhost
      if (
        !url.hostname.includes('localhost') &&
        url.hostname !== 'fake.supabase.test'
      ) {
        print.warning()
      }

      // Log fake.supabase.test requests that aren't handled (debugging)
      if (url.hostname === 'fake.supabase.test') {
        console.log(
          '[MSW] Unhandled request to fake.supabase.test:',
          request.method,
          request.url,
        )
      }
    },
  })
  console.log('🚀 MSW server started')
  console.log('[MSW] Handlers registered:', server.listHandlers().length)
}

/**
 * Helper function to stop the server
 */
export function stopServer() {
  server.close()
  console.log('🛑 MSW server stopped')
}

/**
 * Default export for convenience
 */
export default server

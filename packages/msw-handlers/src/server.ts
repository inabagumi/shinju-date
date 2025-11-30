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
    onUnhandledRequest: 'warn',
  })
  console.log('🚀 MSW server started')
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

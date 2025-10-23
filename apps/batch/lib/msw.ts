import {
  server,
  startServer,
  stopServer,
} from '@shinju-date/msw-handlers/server'

/**
 * Initialize MSW for batch processing
 * Call this at the start of your batch processes to enable API mocking
 */
export function initializeMocking() {
  if (process.env['ENABLE_MSW'] === 'true') {
    startServer()
    console.log('🚀 MSW enabled for batch processing')

    // Cleanup on process exit
    process.on('SIGINT', () => {
      stopServer()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      stopServer()
      process.exit(0)
    })
  }
}

/**
 * Get the MSW server instance for advanced usage
 */
export { server }

/**
 * Manually start/stop mocking
 */
export { startServer, stopServer }

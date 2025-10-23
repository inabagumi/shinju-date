import { allHandlers } from '@shinju-date/msw-handlers'
import { setupWorker } from 'msw/browser'

export const worker = setupWorker(...allHandlers)

// Start the worker when explicitly enabled
export const startMocking = async () => {
  if (process.env['ENABLE_MSW'] === 'true') {
    await worker.start({
      onUnhandledRequest: 'warn',
    })
    console.log('🚀 MSW enabled (admin)')
  }
}

import { allHandlers } from '@shinju-date/msw-handlers'
import { setupWorker } from 'msw/browser'

export const worker = setupWorker(...allHandlers)

// Start the worker in development
export const startMocking = async () => {
  if (process.env.NODE_ENV === 'development') {
    await worker.start({
      onUnhandledRequest: 'warn',
    })
    console.log('🚀 MSW enabled for development (admin)')
  }
}

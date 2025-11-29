import { setupWorker } from 'msw/browser'
import { allHandlers } from './index.js'

export const worker = setupWorker(...allHandlers)

// Start the worker when explicitly enabled
export const startMocking = async () => {
  if (process.env['ENABLE_MSW'] === 'true') {
    try {
      await worker.start({
        onUnhandledRequest: 'warn',
      })
      console.log('🚀 MSW enabled')
    } catch (error) {
      console.error(
        '❌ MSW failed to start. If you see a 404 error for mockServiceWorker.js, run:',
      )
      console.error('   pnpm run msw:init')
      console.error('   Or see AGENTS.md for setup instructions.')
      throw error
    }
  }
}

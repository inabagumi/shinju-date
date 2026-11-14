import { allHandlers } from '@shinju-date/msw-handlers'
import { setupWorker } from 'msw/browser'

export const worker = setupWorker(...allHandlers)

// Start the worker when explicitly enabled
export const startMocking = async () => {
  try {
    await worker.start({
      onUnhandledFrame: 'warn',
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

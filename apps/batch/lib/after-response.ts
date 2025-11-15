/**
 * Helper to execute async cleanup/logging tasks after response is sent
 * In Nitro, we can use event.waitUntil() for background tasks
 * @param event - H3 Event from Nitro
 * @param fn - Async function to execute after response
 */
export function afterResponse(event: any, fn: () => Promise<void>): void {
  // In Nitro/H3, we can use event.waitUntil() for background tasks
  // This is similar to Next.js after() but using Nitro's approach
  if (event.waitUntil) {
    event.waitUntil(fn())
  } else {
    // Fallback: execute immediately if waitUntil is not available
    fn().catch((error) => {
      console.error('Error in afterResponse:', error)
    })
  }
}

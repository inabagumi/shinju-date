'use client'

import { useEffect } from 'react'

// Import the server action for tracking page visits
async function trackPageVisitAction() {
  const { trackPageVisit } = await import('@/lib/session-analytics')
  return trackPageVisit()
}

/**
 * Client-side component that tracks page visits for analytics.
 * This should be included in the root layout to track all page visits.
 */
export default function PageVisitTracker() {
  useEffect(() => {
    trackPageVisitAction().catch((error) => {
      // Silently fail if tracking fails
      console.debug('Page visit tracking failed:', error)
    })
  }, [])

  // This component doesn't render anything
  return null
}

'use client'

import { useEffect } from 'react'
import { trackPageVisit } from '@/lib/session-analytics'

/**
 * Client-side component that tracks page visits for analytics.
 * This should be included in the root layout to track all page visits.
 */
export default function PageVisitTracker() {
  useEffect(() => {
    trackPageVisit().catch((error) => {
      // Silently fail if tracking fails
      console.debug('Page visit tracking failed:', error)
    })
  }, [])

  // This component doesn't render anything
  return null
}

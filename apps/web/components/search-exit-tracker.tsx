'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

// Import the server action for tracking search exits
async function trackSearchExitAction(query: string) {
  const { trackSearchExitWithoutClick } = await import(
    '@/lib/session-analytics'
  )
  return trackSearchExitWithoutClick(query)
}

/**
 * Client-side component that tracks when users leave a search page without clicking any results.
 * This helps calculate search exit rates for analytics.
 */
export default function SearchExitTracker({
  query,
  hasResults,
}: {
  query: string
  hasResults: boolean
}) {
  const router = useRouter()
  const hasClickedRef = useRef(false)
  const hasTrackedRef = useRef(false)

  useEffect(() => {
    if (!query || !hasResults || hasTrackedRef.current) {
      return
    }

    // Listen for clicks on video links (which have ping="/api/ping")
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest('a[ping="/api/ping"]')
      if (link) {
        hasClickedRef.current = true
      }
    }

    // Track exit when page is about to unload
    const handleBeforeUnload = () => {
      if (!hasClickedRef.current && !hasTrackedRef.current) {
        hasTrackedRef.current = true
        // Use sendBeacon for reliable tracking on page unload
        trackSearchExitAction(query).catch(() => {
          // Silently fail if tracking fails
        })
      }
    }

    // Track exit when navigating within the app (SPA navigation)
    const handleRouteChange = () => {
      if (!hasClickedRef.current && !hasTrackedRef.current) {
        hasTrackedRef.current = true
        trackSearchExitAction(query).catch(() => {
          // Silently fail if tracking fails
        })
      }
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Listen for route changes (Next.js app router)
    const originalPush = router.push
    const originalReplace = router.replace

    router.push = (...args) => {
      handleRouteChange()
      return originalPush.apply(router, args)
    }

    router.replace = (...args) => {
      handleRouteChange()
      return originalReplace.apply(router, args)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Restore original router methods
      router.push = originalPush
      router.replace = originalReplace
    }
  }, [query, hasResults, router])

  // This component doesn't render anything
  return null
}

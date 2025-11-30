'use client'

import { useEffect, useEffectEvent } from 'react'
import { logSearchQuery } from '@/lib/search-analytics'

interface SearchQueryTrackerProps {
  query: string
  resultsCount: number
}

/**
 * Client-side component that tracks search queries for analytics.
 * Uses useEffectEvent to ensure accurate tracking with the latest results count
 * while maintaining stable effect dependencies.
 */
export default function SearchQueryTracker({
  query,
  resultsCount,
}: SearchQueryTrackerProps) {
  // useEffectEvent ensures we always use the latest resultsCount
  // while keeping the function reference stable
  const trackQuery = useEffectEvent(async (searchQuery: string) => {
    if (searchQuery) {
      await logSearchQuery(searchQuery, resultsCount)
    }
  })

  // Effect runs only when query changes, avoiding duplicate tracking
  // when resultsCount updates during infinite scroll
  useEffect(() => {
    trackQuery(query)
  }, [query])

  // This component doesn't render anything
  return null
}

'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { startSearchExit } from '@/lib/search-exit'

interface SearchExitTrackerProps {
  hasResults: boolean
  query: string
}

/**
 * 検索の結果を見始めたことを知らせる。離脱の検知と送信は、ルートレイアウトの
 * `SearchExitObserver` が受け持つ。
 */
export default function SearchExitTracker({
  hasResults,
  query,
}: SearchExitTrackerProps) {
  const pathname = usePathname()

  useEffect(() => {
    if (query && hasResults) {
      startSearchExit(query, pathname)
    }
  }, [hasResults, pathname, query])

  return null
}

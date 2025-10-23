import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { getPopularKeywords } from '@/lib/analytics/get-popular-keywords'
import { getSearchVolume } from '../_lib/get-search-volume'
import { getZeroResultKeywords } from '../_lib/get-zero-result-keywords'
import SearchAnalyticsClient from './search-analytics-client'

/**
 * SearchAnalyticsContent - Async component that fetches search analytics data
 * This component is wrapped with Suspense in the parent page
 */
export async function SearchAnalyticsContent() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 6 })
  const endDate = today

  const [popularKeywords, zeroResultKeywords, searchVolume] = await Promise.all(
    [
      getPopularKeywords(20, startDate, endDate),
      getZeroResultKeywords(),
      getSearchVolume(7, startDate.toString(), endDate.toString()),
    ],
  )

  const fetchSearchVolume = async (start: string, end: string) => {
    'use server'
    return getSearchVolume(7, start, end)
  }

  const fetchPopularKeywords = async (date: string, limit: number) => {
    'use server'
    const plainDate = Temporal.PlainDate.from(date)
    return getPopularKeywords(limit, plainDate)
  }

  const fetchPopularKeywordsForRange = async (
    startDate: string,
    endDate: string,
    limit: number,
  ) => {
    'use server'
    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getPopularKeywords(limit, start, end)
  }

  const fetchZeroResultKeywords = async () => {
    'use server'
    return getZeroResultKeywords()
  }

  return (
    <SearchAnalyticsClient
      fetchPopularKeywords={fetchPopularKeywords}
      fetchPopularKeywordsForRange={fetchPopularKeywordsForRange}
      fetchSearchVolume={fetchSearchVolume}
      fetchZeroResultKeywords={fetchZeroResultKeywords}
      initialPopularKeywords={popularKeywords}
      initialSearchVolume={searchVolume}
      initialZeroResultKeywords={zeroResultKeywords}
    />
  )
}

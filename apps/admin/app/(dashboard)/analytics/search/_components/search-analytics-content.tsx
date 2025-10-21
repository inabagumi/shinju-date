import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { getPopularKeywords } from '../_lib/get-popular-keywords'
import { getPopularKeywordsForRange } from '../_lib/get-popular-keywords-for-range'
import { getSearchVolume } from '../_lib/get-search-volume'
import { getZeroResultKeywords } from '../_lib/get-zero-result-keywords'
import SearchAnalyticsClient from './search-analytics-client'

/**
 * SearchAnalyticsContent - Async component that fetches search analytics data
 * This component is wrapped with Suspense in the parent page
 */
export async function SearchAnalyticsContent() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 6 }).toString()
  const endDate = today.toString()

  const [popularKeywords, zeroResultKeywords, searchVolume] = await Promise.all(
    [
      getPopularKeywordsForRange(startDate, endDate, 20),
      getZeroResultKeywords(),
      getSearchVolume(7, startDate, endDate),
    ],
  )

  const fetchSearchVolume = async (start: string, end: string) => {
    'use server'
    return getSearchVolume(7, start, end)
  }

  const fetchPopularKeywords = async (date: string, limit: number) => {
    'use server'
    return getPopularKeywords(date, limit)
  }

  const fetchPopularKeywordsForRange = async (
    startDate: string,
    endDate: string,
    limit: number,
  ) => {
    'use server'
    return getPopularKeywordsForRange(startDate, endDate, limit)
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

import { Temporal } from 'temporal-polyfill'
import { getPopularKeywords } from '@/lib/analytics/get-popular-keywords'
import {
  getDefaultDateRange,
  parseDateRangeFromUrl,
  parseSelectedDateFromUrl,
} from '../../_lib/url-state'
import { getSearchVolume } from '../_lib/get-search-volume'
import { getZeroResultKeywords } from '../_lib/get-zero-result-keywords'
import SearchAnalyticsClient from './search-analytics-client'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

/**
 * SearchAnalyticsContent - Async component that fetches search analytics data
 * This component is wrapped with Suspense in the parent page
 */
export async function SearchAnalyticsContent({ searchParams }: Props) {
  // Parse date range from URL parameters or use default
  const urlSearchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      urlSearchParams.set(key, value)
    } else if (Array.isArray(value)) {
      urlSearchParams.set(key, value[0] || '')
    }
  }

  const dateRangeFromUrl = parseDateRangeFromUrl(urlSearchParams)
  const dateRange = dateRangeFromUrl || getDefaultDateRange()
  const selectedDateFromUrl = parseSelectedDateFromUrl(urlSearchParams)

  const startDate = Temporal.PlainDate.from(dateRange.startDate)
  const endDate = Temporal.PlainDate.from(dateRange.endDate)

  // Check if this is a single-date scenario:
  // 1. Explicit date parameter exists (selectedDateFromUrl)
  // 2. Date range is a single day (startDate === endDate)
  const isSingleDateRange = Temporal.PlainDate.compare(startDate, endDate) === 0
  const effectiveSelectedDate =
    selectedDateFromUrl || (isSingleDateRange ? startDate.toString() : null)

  // If there's a selected date, fetch data for that specific date
  // Otherwise, fetch data for the date range
  const [popularKeywords, zeroResultKeywords, searchVolume] = await Promise.all(
    [
      effectiveSelectedDate
        ? getPopularKeywords(20, Temporal.PlainDate.from(effectiveSelectedDate))
        : getPopularKeywords(20, startDate, endDate),
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
      initialDateRange={dateRange}
      initialPopularKeywords={popularKeywords}
      initialSearchVolume={searchVolume}
      initialSelectedDate={effectiveSelectedDate}
      initialZeroResultKeywords={zeroResultKeywords}
    />
  )
}

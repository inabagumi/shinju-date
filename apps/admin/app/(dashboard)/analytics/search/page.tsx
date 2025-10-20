import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import SearchAnalyticsClient from './_components/search-analytics-client'
import { getPopularKeywords } from './_lib/get-popular-keywords'
import { getSearchVolume } from './_lib/get-search-volume'
import { getZeroResultKeywords } from './_lib/get-zero-result-keywords'

export default async function SearchAnalyticsPage() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 6 }).toString()
  const endDate = today.toString()

  const [popularKeywords, zeroResultKeywords, searchVolume] = await Promise.all(
    [
      getPopularKeywords(endDate, 20),
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

  const fetchZeroResultKeywords = async () => {
    'use server'
    return getZeroResultKeywords()
  }

  return (
    <SearchAnalyticsClient
      fetchPopularKeywords={fetchPopularKeywords}
      fetchSearchVolume={fetchSearchVolume}
      fetchZeroResultKeywords={fetchZeroResultKeywords}
      initialPopularKeywords={popularKeywords}
      initialSearchVolume={searchVolume}
      initialZeroResultKeywords={zeroResultKeywords}
    />
  )
}

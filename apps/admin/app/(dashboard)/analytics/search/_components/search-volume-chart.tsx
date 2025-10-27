import { cache } from 'react'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { getSearchVolume } from '../_lib/get-search-volume'
import SearchVolumeChartUI from './search-volume-chart-ui'

type Props = {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Cached function to fetch search volume data based on date range
 */
const fetchSearchVolumeData = cache(
  async (startDate: string, endDate: string) => {
    return getSearchVolume(7, startDate, endDate)
  },
)

/**
 * Async server component that fetches and displays search volume chart
 */
export async function SearchVolumeChart({ searchParams }: Props) {
  const { dateRange } = await searchParams

  const searchVolume = await fetchSearchVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  return <SearchVolumeChartUI data={searchVolume} />
}

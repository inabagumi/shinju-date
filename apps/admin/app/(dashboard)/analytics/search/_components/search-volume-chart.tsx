import { cache } from 'react'
import { getAnalyticsDateParams } from '../../_lib/cached-params'
import { getSearchVolume } from '../_lib/get-search-volume'
import SearchVolumeChartComponent from './search-volume-chart'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
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
  const { dateRange } = getAnalyticsDateParams(searchParams)

  const searchVolume = await fetchSearchVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  return <SearchVolumeChartComponent data={searchVolume} />
}

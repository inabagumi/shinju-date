import { cache } from 'react'
import { getAnalyticsDateParams } from '../../_lib/cached-params'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { getClickVolume } from '../_lib/get-click-volume'
import ClickVolumeChartUI from './click-volume-chart-ui'

type Props = {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Cached function to fetch click volume data based on date range
 */
const fetchClickVolumeData = cache(
  async (startDate: string, endDate: string) => {
    return getClickVolume(7, startDate, endDate)
  },
)

/**
 * Async server component that fetches and displays click volume chart
 */
export async function ClickVolumeChart({ searchParams }: Props) {
  const { dateRange } = await getAnalyticsDateParams(searchParams)

  const clickVolume = await fetchClickVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  return <ClickVolumeChartUI data={clickVolume} />
}

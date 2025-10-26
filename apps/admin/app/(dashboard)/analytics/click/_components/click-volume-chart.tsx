import { cache } from 'react'
import { getAnalyticsDateParams } from '../../_lib/cached-params'
import { getClickVolume } from '../_lib/get-click-volume'
import ClickVolumeChartComponent from './click-volume-chart'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
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
  const { dateRange } = getAnalyticsDateParams(searchParams)

  const clickVolume = await fetchClickVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  return <ClickVolumeChartComponent data={clickVolume} />
}

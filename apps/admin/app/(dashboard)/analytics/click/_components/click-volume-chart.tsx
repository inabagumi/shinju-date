import { cache } from 'react'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { getClickVolume } from '../_lib/get-click-volume'
import ClickVolumeChartUI from './click-volume-chart-ui'
import { ClickVolumeChartWithNavigation } from './click-volume-chart-with-navigation'

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
  const { dateRange, selectedDate } = await searchParams

  const clickVolume = await fetchClickVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  const totalClicks = clickVolume.reduce((sum, day) => sum + day.clicks, 0)

  return (
    <>
      <h2 className="mb-4 font-semibold text-xl">クリックボリューム</h2>
      <div className="mb-4 rounded-lg bg-green-50 p-4">
        <p className="text-gray-600 text-sm">総クリック数</p>
        <div className="flex items-baseline gap-2">
          <p className="font-bold text-2xl text-green-600">{totalClicks}</p>
        </div>
      </div>
      <ClickVolumeChartWithNavigation
        ChartComponent={ClickVolumeChartUI}
        data={clickVolume}
      />
      {selectedDate && (
        <p className="mt-2 text-center text-gray-600 text-sm">
          選択された日付: {selectedDate}
        </p>
      )}
    </>
  )
}

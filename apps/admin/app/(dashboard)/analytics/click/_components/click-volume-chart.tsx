import { StatTile } from '@shinju-date/ui'
import { cache } from 'react'
import { formatDateLabel } from '../../_lib/format-date'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { getClickVolume } from '../_lib/get-click-volume'
import ClickVolumeChartUI from './click-volume-chart-ui'
import { ClickVolumeChartWithNavigation } from './click-volume-chart-with-navigation'

interface Props {
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
      <StatTile
        className="mb-4 sm:max-w-xs"
        label="総クリック数"
        value={totalClicks.toLocaleString('ja-JP')}
      />
      <ClickVolumeChartWithNavigation
        ChartComponent={ClickVolumeChartUI}
        data={clickVolume}
      />
      {selectedDate && (
        <p className="mt-2 text-center text-meta text-muted">
          選択された日付: {formatDateLabel(selectedDate)}
        </p>
      )}
    </>
  )
}

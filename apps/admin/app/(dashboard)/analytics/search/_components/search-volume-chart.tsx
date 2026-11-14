import { StatTile } from '@shinju-date/ui'
import { cache } from 'react'
import { formatDateLabel } from '../../_lib/format-date'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { getSearchVolume } from '../_lib/get-search-volume'
import SearchVolumeChartUI from './search-volume-chart-ui'
import { SearchVolumeChartWithNavigation } from './search-volume-chart-with-navigation'

interface Props {
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
  const { dateRange, selectedDate } = await searchParams

  const searchVolume = await fetchSearchVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  const totalSearches = searchVolume.reduce((sum, day) => sum + day.count, 0)

  return (
    <>
      <StatTile
        className="mb-4 sm:max-w-xs"
        label="総検索数"
        value={totalSearches.toLocaleString('ja-JP')}
      />
      <SearchVolumeChartWithNavigation
        ChartComponent={SearchVolumeChartUI}
        data={searchVolume}
      />
      {selectedDate && (
        <p className="mt-2 text-center text-meta text-muted">
          選択された日付: {formatDateLabel(selectedDate)}
        </p>
      )}
    </>
  )
}

import { cache } from 'react'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { getSearchVolume } from '../_lib/get-search-volume'
import SearchVolumeChartUI from './search-volume-chart-ui'
import { SearchVolumeChartWithNavigation } from './search-volume-chart-with-navigation'

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
  const { dateRange, selectedDate } = await searchParams

  const searchVolume = await fetchSearchVolumeData(
    dateRange.startDate,
    dateRange.endDate,
  )

  const totalSearches = searchVolume.reduce((sum, day) => sum + day.count, 0)

  return (
    <>
      <div className="mb-4 rounded-lg bg-green-50 p-4">
        <p className="text-gray-600 text-sm">総検索数</p>
        <div className="flex items-baseline gap-2">
          <p className="font-bold text-2xl text-green-600">{totalSearches}</p>
        </div>
      </div>
      <SearchVolumeChartWithNavigation
        ChartComponent={SearchVolumeChartUI}
        data={searchVolume}
      />
      {selectedDate && (
        <p className="mt-2 text-center text-gray-600 text-sm">
          選択された日付: {selectedDate}
        </p>
      )}
    </>
  )
}

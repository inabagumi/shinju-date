import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getSearchExitRates } from '@/lib/analytics/get-search-quality-metrics'
import { ExportMenu } from '../../_components/export-menu'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

type Props = {
  searchParams: Promise<AnalyticsSearchParams>
}

type SearchExitRate = {
  keyword: string
  exitRate: number
  searchCount: number
}

/**
 * Cached function to fetch search exit rates data
 */
const fetchSearchExitRatesData = cache(
  async (
    startDate: string,
    endDate: string,
    selectedDate: string | null,
  ): Promise<SearchExitRate[]> => {
    if (selectedDate) {
      return getSearchExitRates(
        Temporal.PlainDate.from(selectedDate),
        undefined,
        20,
      )
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getSearchExitRates(start, end, 20)
  },
)

/**
 * Search Exit Rate Widget Component
 */
function SearchExitRateWidgetComponent({
  exitRates,
  dateRange,
  selectedDate,
}: {
  exitRates: SearchExitRate[]
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  // Helper to get exit rate styling
  const getExitRateStyle = (exitRate: number) => {
    if (exitRate >= 70) return 'bg-red-100 text-red-800'
    if (exitRate >= 50) return 'bg-yellow-100 text-yellow-800'
    if (exitRate >= 30) return 'bg-orange-100 text-orange-800'
    return 'bg-green-100 text-green-800'
  }

  const getExitRateLabel = (exitRate: number) => {
    if (exitRate >= 70) return '要改善'
    if (exitRate >= 50) return '注意'
    if (exitRate >= 30) return '普通'
    return '良好'
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">
          検索からの離脱率
          {selectedDate ? (
            <span className="ml-2 text-blue-600 text-sm">({selectedDate})</span>
          ) : (
            <span className="ml-2 text-green-600 text-sm">
              ({dateRange.startDate}〜{dateRange.endDate})
            </span>
          )}
        </h2>
        <ExportMenu
          dateRange={dateRange}
          selectedDate={selectedDate}
          type="search-exit-rates"
        />
      </div>

      <p className="mb-4 text-gray-600 text-sm">
        検索結果を一度もクリックせずに離脱した割合をキーワードごとに表示します。
        離脱率が高いキーワードは、検索結果がユーザーの期待と乖離している可能性があります。
      </p>

      {exitRates.length > 0 ? (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {exitRates.map((item, index) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              key={item.keyword}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600 text-sm">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.keyword}</p>
                <p className="text-gray-500 text-xs">
                  検索回数: {item.searchCount}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={`inline-block rounded-full px-2 py-1 font-semibold text-xs ${getExitRateStyle(item.exitRate)}`}
                >
                  {item.exitRate.toFixed(1)}%
                </div>
                <p className="mt-1 text-gray-500 text-xs">
                  {getExitRateLabel(item.exitRate)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">データがありません</p>
      )}

      <div className="mt-4 text-gray-600 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>評価基準:</strong>
            <div className="text-green-700">30%未満: 良好</div>
            <div className="text-orange-700">30-49%: 普通</div>
          </div>
          <div>
            <div className="text-yellow-700">50-69%: 注意</div>
            <div className="text-red-700">70%以上: 要改善</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Async server component that fetches and displays search exit rate widget
 */
export async function SearchExitRateWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const exitRates = await fetchSearchExitRatesData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <SearchExitRateWidgetComponent
      dateRange={dateRange}
      exitRates={exitRates}
      selectedDate={selectedDate}
    />
  )
}

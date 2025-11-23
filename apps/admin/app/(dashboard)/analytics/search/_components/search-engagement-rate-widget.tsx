import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getSearchEngagementRate } from '@/lib/analytics/get-search-quality-metrics'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Cached function to fetch search engagement rate data
 */
const fetchSearchEngagementData = cache(
  async (
    startDate: string,
    endDate: string,
    selectedDate: string | null,
  ): Promise<number> => {
    if (selectedDate) {
      return getSearchEngagementRate(Temporal.PlainDate.from(selectedDate))
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getSearchEngagementRate(start, end)
  },
)

/**
 * Search Engagement Rate Widget Component
 */
function SearchEngagementRateWidgetComponent({
  engagementRate,
  dateRange,
  selectedDate,
}: {
  engagementRate: number
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  // Determine the performance level for styling
  const getPerformanceLevel = (rate: number) => {
    if (rate >= 30) return 'excellent'
    if (rate >= 20) return 'good'
    if (rate >= 10) return 'average'
    return 'poor'
  }

  const performanceLevel = getPerformanceLevel(engagementRate)

  const performanceStyles = {
    average: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    excellent: 'bg-green-50 text-green-700 border-green-200',
    good: 'bg-blue-50 text-blue-700 border-blue-200',
    poor: 'bg-red-50 text-red-700 border-red-200',
  }

  const performanceLabels = {
    average: '平均的',
    excellent: '優秀',
    good: '良好',
    poor: '改善が必要',
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-semibold text-xl">
          検索利用率
          {selectedDate ? (
            <span className="ml-2 text-blue-600 text-sm">({selectedDate})</span>
          ) : (
            <span className="ml-2 text-green-600 text-sm">
              ({dateRange.startDate}〜{dateRange.endDate})
            </span>
          )}
        </h2>
      </div>

      <p className="mb-4 text-gray-600 text-sm">
        サイトを訪れたユーザーのうち、検索機能を利用した割合を示します。
        この数値が低い場合、検索窓のUIや配置の見直しを検討することをお勧めします。
      </p>

      <div
        className={`rounded-lg border-2 p-6 ${performanceStyles[performanceLevel]}`}
      >
        <div className="text-center">
          <div className="font-bold text-4xl">{engagementRate.toFixed(1)}%</div>
          <div className="mt-2 font-medium text-sm">
            検索利用率 ({performanceLabels[performanceLevel]})
          </div>
        </div>
      </div>

      <div className="mt-4 text-gray-600 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>判定基準:</strong>
            <div>30%以上: 優秀</div>
            <div>20-29%: 良好</div>
          </div>
          <div>
            <div>10-19%: 平均的</div>
            <div>10%未満: 改善が必要</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Async server component that fetches and displays search engagement rate widget
 */
export async function SearchEngagementRateWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const engagementRate = await fetchSearchEngagementData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <SearchEngagementRateWidgetComponent
      dateRange={dateRange}
      engagementRate={engagementRate}
      selectedDate={selectedDate}
    />
  )
}

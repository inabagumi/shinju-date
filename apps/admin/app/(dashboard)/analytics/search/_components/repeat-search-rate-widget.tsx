import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getRepeatSearchRate } from '@/lib/analytics/get-search-quality-metrics'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

type Props = {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Cached function to fetch repeat search rate data
 */
const fetchRepeatSearchRateData = cache(
  async (
    startDate: string,
    endDate: string,
    selectedDate: string | null,
  ): Promise<number> => {
    if (selectedDate) {
      return getRepeatSearchRate(Temporal.PlainDate.from(selectedDate))
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getRepeatSearchRate(start, end)
  },
)

/**
 * Repeat Search Rate Widget Component
 */
function RepeatSearchRateWidgetComponent({
  repeatRate,
  dateRange,
  selectedDate,
}: {
  repeatRate: number
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  // Determine engagement level and interpretation
  const getEngagementLevel = (rate: number) => {
    if (rate >= 3.0) return 'high'
    if (rate >= 2.0) return 'moderate'
    if (rate >= 1.5) return 'normal'
    return 'low'
  }

  const engagementLevel = getEngagementLevel(repeatRate)

  const engagementStyles = {
    high: 'bg-purple-50 text-purple-700 border-purple-200',
    low: 'bg-gray-50 text-gray-700 border-gray-200',
    moderate: 'bg-blue-50 text-blue-700 border-blue-200',
    normal: 'bg-green-50 text-green-700 border-green-200',
  }

  const engagementLabels = {
    high: '高いエンゲージメント',
    low: '低い活動',
    moderate: '適度なエンゲージメント',
    normal: '標準的',
  }

  const engagementDescriptions = {
    high: 'ユーザーが積極的に情報を探しています。検索結果の品質を継続的に改善し、ユーザーの期待に応えましょう。',
    low: 'ユーザーの検索活動が少ないか、一度の検索で満足しています。',
    moderate:
      'ユーザーは複数の検索を行いながら、必要な情報を見つけています。検索体験は良好です。',
    normal:
      'ユーザーは基本的に一度の検索で満足しています。標準的な検索パターンです。',
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-semibold text-xl">
          リピート検索率
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
        1セッションあたりの平均検索回数を表示します。
        ユーザーエンゲージメントを測る指標として活用できます。
      </p>

      <div
        className={`rounded-lg border-2 p-6 ${engagementStyles[engagementLevel]}`}
      >
        <div className="text-center">
          <div className="font-bold text-4xl">{repeatRate.toFixed(1)}</div>
          <div className="mt-2 font-medium text-sm">
            回/セッション ({engagementLabels[engagementLevel]})
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-4">
        <p className="text-gray-700 text-sm">
          <strong>解釈:</strong> {engagementDescriptions[engagementLevel]}
        </p>
      </div>

      <div className="mt-4 text-gray-600 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>参考基準:</strong>
            <div>3.0回以上: 高いエンゲージメント</div>
            <div>2.0-2.9回: 適度なエンゲージメント</div>
          </div>
          <div>
            <div>1.5-1.9回: 標準的</div>
            <div>1.5回未満: 低い活動</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Async server component that fetches and displays repeat search rate widget
 */
export async function RepeatSearchRateWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const repeatRate = await fetchRepeatSearchRateData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <RepeatSearchRateWidgetComponent
      dateRange={dateRange}
      repeatRate={repeatRate}
      selectedDate={selectedDate}
    />
  )
}

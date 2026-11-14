import { StatTile } from '@shinju-date/ui'
import { cache } from 'react'
import { getSearchEngagementRate } from '@/lib/analytics/get-search-quality-metrics'
import { WidgetHeader } from '../../_components/widget-header'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { MetricNoData } from './metric-no-data'

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
  ): Promise<number | null> => {
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
  engagementRate: number | null
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

  const performanceLabels = {
    average: '平均的',
    excellent: '優秀',
    good: '良好',
    poor: '改善が必要',
  }

  const performanceLevel =
    engagementRate === null ? null : getPerformanceLevel(engagementRate)

  return (
    <div>
      <WidgetHeader
        dateRange={dateRange}
        description="サイトを訪れたユーザーのうち、検索機能を利用した割合を示します。この数値が低い場合、検索窓のUIや配置の見直しを検討することをお勧めします。"
        selectedDate={selectedDate}
        title="検索利用率"
      />

      {engagementRate === null || performanceLevel === null ? (
        <MetricNoData
          description="この期間に計測されたセッションがないため、評価できません。"
          label="検索利用率"
        />
      ) : (
        <StatTile
          label={`検索利用率 (${performanceLabels[performanceLevel]})`}
          value={`${engagementRate.toFixed(1)}%`}
        />
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 text-caption text-muted">
        <dt className="col-span-2 font-semibold">判定基準</dt>
        <dd>30%以上: 優秀</dd>
        <dd>20-29%: 良好</dd>
        <dd>10-19%: 平均的</dd>
        <dd>10%未満: 改善が必要</dd>
      </dl>
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

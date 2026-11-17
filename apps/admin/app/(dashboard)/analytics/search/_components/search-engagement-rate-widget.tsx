import { StatTile } from '@shinju-date/ui'
import { getSearchEngagementRate } from '@/lib/analytics/get-search-quality-metrics'
import { WidgetHeader } from '../../_components/widget-header'
import { resolvePeriod } from '../../_lib/resolve-period'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { MetricNoData } from './metric-no-data'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

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

  const { start, end } = resolvePeriod({ dateRange, selectedDate })
  const engagementRate = await getSearchEngagementRate(start, end)

  return (
    <SearchEngagementRateWidgetComponent
      dateRange={dateRange}
      engagementRate={engagementRate}
      selectedDate={selectedDate}
    />
  )
}

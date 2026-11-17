import { StatTile } from '@shinju-date/ui'
import { getSearchEngagementRate } from '@/lib/analytics/get-search-quality-metrics'
import { WidgetHeader } from '../../_components/widget-header'
import { resolvePeriod } from '../../_lib/resolve-period'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { ENGAGEMENT_RATE_RATINGS, rate } from '../_lib/metric-ratings'
import { MetricLegend } from './metric-legend'
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
  return (
    <div>
      <WidgetHeader
        dateRange={dateRange}
        description="サイトを訪れたユーザーのうち、検索機能を利用した割合を示します。この数値が低い場合、検索窓のUIや配置の見直しを検討することをお勧めします。"
        selectedDate={selectedDate}
        title="検索利用率"
      />

      {engagementRate === null ? (
        <MetricNoData
          description="この期間に計測されたセッションがないため、評価できません。"
          label="検索利用率"
        />
      ) : (
        <StatTile
          label={`検索利用率 (${rate(engagementRate, ENGAGEMENT_RATE_RATINGS).label})`}
          value={`${engagementRate.toFixed(1)}%`}
        />
      )}

      <MetricLegend
        ratings={ENGAGEMENT_RATE_RATINGS}
        title="判定基準"
        unit="%"
      />
    </div>
  )
}

/**
 * Async server component that fetches and displays search engagement rate widget
 */
export async function SearchEngagementRateWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const range = resolvePeriod({ dateRange, selectedDate })
  const engagementRate = await getSearchEngagementRate({ range })

  return (
    <SearchEngagementRateWidgetComponent
      dateRange={dateRange}
      engagementRate={engagementRate}
      selectedDate={selectedDate}
    />
  )
}

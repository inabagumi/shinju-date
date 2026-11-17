import { StatTile } from '@shinju-date/ui'
import { getRepeatSearchRate } from '@/lib/analytics/get-search-quality-metrics'
import { WidgetHeader } from '../../_components/widget-header'
import { resolvePeriod } from '../../_lib/resolve-period'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { REPEAT_SEARCH_RATE_RATINGS, rate } from '../_lib/metric-ratings'
import { MetricLegend } from './metric-legend'
import { MetricNoData } from './metric-no-data'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Repeat Search Rate Widget Component
 */
function RepeatSearchRateWidgetComponent({
  repeatRate,
  dateRange,
  selectedDate,
}: {
  repeatRate: number | null
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  const rating =
    repeatRate === null ? null : rate(repeatRate, REPEAT_SEARCH_RATE_RATINGS)

  return (
    <div>
      <WidgetHeader
        dateRange={dateRange}
        description="1セッションあたりの平均検索回数を表示します。ユーザーエンゲージメントを測る指標として活用できます。"
        selectedDate={selectedDate}
        title="リピート検索率"
      />

      {repeatRate === null || rating === null ? (
        <MetricNoData
          description="この期間に検索したセッションがないため、評価できません。"
          label="回/セッション"
        />
      ) : (
        <>
          <StatTile
            label={`回/セッション (${rating.label})`}
            value={repeatRate.toFixed(1)}
          />

          <p className="mt-4 text-meta">
            <strong>解釈:</strong> {rating.description}
          </p>
        </>
      )}

      <MetricLegend
        fractionDigits={1}
        ratings={REPEAT_SEARCH_RATE_RATINGS}
        title="参考基準"
        unit="回"
      />
    </div>
  )
}

/**
 * Async server component that fetches and displays repeat search rate widget
 */
export async function RepeatSearchRateWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const { start, end } = resolvePeriod({ dateRange, selectedDate })
  const repeatRate = await getRepeatSearchRate(start, end)

  return (
    <RepeatSearchRateWidgetComponent
      dateRange={dateRange}
      repeatRate={repeatRate}
      selectedDate={selectedDate}
    />
  )
}

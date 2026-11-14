import { StatTile } from '@shinju-date/ui'
import { cache } from 'react'
import { getRepeatSearchRate } from '@/lib/analytics/get-search-quality-metrics'
import { WidgetHeader } from '../../_components/widget-header'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { MetricNoData } from './metric-no-data'

interface Props {
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
  ): Promise<number | null> => {
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
  repeatRate: number | null
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

  const engagementLevel =
    repeatRate === null ? null : getEngagementLevel(repeatRate)

  return (
    <div>
      <WidgetHeader
        dateRange={dateRange}
        description="1セッションあたりの平均検索回数を表示します。ユーザーエンゲージメントを測る指標として活用できます。"
        selectedDate={selectedDate}
        title="リピート検索率"
      />

      {repeatRate === null || engagementLevel === null ? (
        <MetricNoData
          description="この期間に検索したセッションがないため、評価できません。"
          label="回/セッション"
        />
      ) : (
        <>
          <StatTile
            label={`回/セッション (${engagementLabels[engagementLevel]})`}
            value={repeatRate.toFixed(1)}
          />

          <p className="mt-4 text-meta">
            <strong>解釈:</strong> {engagementDescriptions[engagementLevel]}
          </p>
        </>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 text-caption text-muted">
        <dt className="col-span-2 font-semibold">参考基準</dt>
        <dd>3.0回以上: 高いエンゲージメント</dd>
        <dd>2.0-2.9回: 適度なエンゲージメント</dd>
        <dd>1.5-1.9回: 標準的</dd>
        <dd>1.5回未満: 低い活動</dd>
      </dl>
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

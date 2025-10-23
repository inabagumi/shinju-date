import Link from 'next/link'
import type { PopularChannel } from '@/lib/analytics/get-popular-channels'
import type { PopularChannelWithComparison } from '../_lib/add-comparison-data'

type PopularChannelsWidgetProps = {
  channels: PopularChannel[] | PopularChannelWithComparison[]
  dateRange?: {
    startDate: string
    endDate: string
  }
  selectedDate?: string | null
  onExportCSV: () => void
  loading?: boolean
  comparisonEnabled?: boolean
}

function formatRankChange(
  comparison: PopularChannelWithComparison['comparison'] | undefined,
): {
  icon: string
  text: string
  className: string
} {
  if (!comparison) {
    return { className: '', icon: '', text: '' }
  }

  if (comparison.previousRank === undefined) {
    return {
      className: 'text-blue-600',
      icon: '圏外→',
      text: '圏外→',
    }
  }

  if (comparison.rankChange === undefined || comparison.rankChange === 0) {
    return {
      className: 'text-gray-500',
      icon: '→',
      text: '変動なし',
    }
  }

  if (comparison.rankChange > 0) {
    return {
      className: 'text-green-600',
      icon: '▲',
      text: `▲${comparison.rankChange}`,
    }
  }

  return {
    className: 'text-red-600',
    icon: '▼',
    text: `▼${Math.abs(comparison.rankChange)}`,
  }
}

function formatClicksChange(
  comparison: PopularChannelWithComparison['comparison'] | undefined,
): {
  text: string
  className: string
} {
  if (!comparison) {
    return { className: '', text: '' }
  }

  const percent = comparison.clicksChangePercent
  const sign = percent >= 0 ? '+' : ''
  const className = percent >= 0 ? 'text-green-600' : 'text-red-600'

  return {
    className,
    text: `${sign}${percent.toFixed(1)}%`,
  }
}

export function PopularChannelsWidget({
  channels,
  dateRange,
  selectedDate,
  onExportCSV,
  loading = false,
  comparisonEnabled = false,
}: PopularChannelsWidgetProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">
          {selectedDate
            ? `人気チャンネルランキング (${selectedDate})`
            : dateRange
              ? `人気チャンネルランキング (${dateRange.startDate} 〜 ${dateRange.endDate})`
              : '人気チャンネルランキング'}
        </h2>
        <button
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
          disabled={loading}
          onClick={onExportCSV}
          type="button"
        >
          CSV エクスポート
        </button>
      </div>
      <p className="mb-4 text-gray-600 text-sm">
        最もクリックされているチャンネルのランキング。どのタレントが人気かを把握できます。
        {comparisonEnabled && (
          <span className="ml-2 text-blue-600">前期間との比較情報を表示中</span>
        )}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 text-blue-700">
            読み込み中...
          </div>
        </div>
      ) : channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {channels.map((channel, index) => {
            const rankChange = formatRankChange(
              'comparison' in channel ? channel.comparison : undefined,
            )
            const clicksChange = formatClicksChange(
              'comparison' in channel ? channel.comparison : undefined,
            )

            return (
              <div
                className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                key={channel.id}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-600 text-sm">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <Link
                    className="font-medium hover:underline"
                    href={`/videos?channel=${channel.slug}`}
                  >
                    {channel.name}
                  </Link>
                  {comparisonEnabled &&
                    'comparison' in channel &&
                    channel.comparison && (
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`font-medium text-xs ${rankChange.className}`}
                        >
                          {rankChange.text}
                        </span>
                        <span className={`text-xs ${clicksChange.className}`}>
                          {clicksChange.text}
                        </span>
                      </div>
                    )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-gray-900">
                    {channel.clicks}
                  </p>
                  <p className="text-gray-500 text-xs">回</p>
                  {comparisonEnabled &&
                    'comparison' in channel &&
                    channel.comparison &&
                    channel.comparison.previousClicks > 0 && (
                      <p className="text-gray-400 text-xs">
                        前: {channel.comparison.previousClicks}回
                      </p>
                    )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">データがありません</p>
      )}
    </div>
  )
}

import Link from 'next/link'
import type { PopularChannel } from '../_lib/get-popular-channels'
import type { PopularChannelForDate } from '../_lib/get-popular-channels-for-date'

type PopularChannelsWidgetProps = {
  channels: PopularChannel[] | PopularChannelForDate[]
  dateRange?: {
    startDate: string
    endDate: string
  }
  selectedDate?: string | null
  onExportCSV: () => void
  loading?: boolean
}

export function PopularChannelsWidget({
  channels,
  dateRange,
  selectedDate,
  onExportCSV,
  loading = false,
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
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 text-blue-700">
            読み込み中...
          </div>
        </div>
      ) : channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {channels.map((channel, index) => (
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
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-gray-900">{channel.clicks}</p>
                <p className="text-gray-500 text-xs">回</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">データがありません</p>
      )}
    </div>
  )
}

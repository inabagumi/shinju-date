import Link from 'next/link'
import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getPopularChannels } from '@/lib/analytics/get-popular-channels'
import { getAnalyticsDateParams } from '../../_lib/cached-params'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

/**
 * Cached function to fetch popular channels data
 */
const fetchPopularChannelsData = cache(
  async (startDate: string, endDate: string, selectedDate: string | null) => {
    if (selectedDate) {
      return getPopularChannels(20, Temporal.PlainDate.from(selectedDate))
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getPopularChannels(20, start, end)
  },
)

/**
 * Simple Popular Channels Widget Component for server rendering
 */
function SimplePopularChannelsWidget({
  channels,
  dateRange,
  selectedDate,
}: {
  channels: Array<{ name: string; slug: string; clicks: number }>
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  return (
    <div>
      <p className="mb-4 text-gray-600 text-sm">
        {selectedDate
          ? `${selectedDate} の人気チャンネルランキング`
          : `${dateRange.startDate} 〜 ${dateRange.endDate} の人気チャンネルランキング`}
      </p>

      {channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {channels.map((channel, index) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              key={channel.slug}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600 text-sm">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <Link
                  className="font-medium hover:underline"
                  href={`/videos?channelId=${channel.slug}`}
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

/**
 * Async server component that fetches and displays popular channels widget
 */
export async function PopularChannelsWidgetServer({ searchParams }: Props) {
  const { dateRange, selectedDate } = getAnalyticsDateParams(searchParams)

  const popularChannels = await fetchPopularChannelsData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <SimplePopularChannelsWidget
      channels={popularChannels}
      dateRange={dateRange}
      selectedDate={selectedDate}
    />
  )
}

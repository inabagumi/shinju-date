import Link from 'next/link'
import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getPopularVideos } from '@/lib/analytics/get-popular-videos'
import { getAnalyticsDateParams } from '../../_lib/cached-params'
import { ADMIN_ROUTES } from '../../_lib/routes'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

/**
 * Cached function to fetch popular videos data
 */
const fetchPopularVideosData = cache(
  async (startDate: string, endDate: string, selectedDate: string | null) => {
    if (selectedDate) {
      return getPopularVideos(20, Temporal.PlainDate.from(selectedDate))
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getPopularVideos(20, start, end)
  },
)

/**
 * Simple Popular Videos Widget Component for server rendering
 */
function SimplePopularVideosWidget({
  videos,
  dateRange,
  selectedDate,
}: {
  videos: Array<{ title: string; slug: string; clicks: number }>
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  return (
    <div>
      <p className="mb-4 text-gray-600 text-sm">
        {selectedDate
          ? `${selectedDate} の人気動画ランキング`
          : `${dateRange.startDate} 〜 ${dateRange.endDate} の人気動画ランキング`}
      </p>

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {videos.map((video, index) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              key={video.slug}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600 text-sm">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <Link
                  className="font-medium hover:underline"
                  href={`${ADMIN_ROUTES.VIDEOS}?search=${video.slug}`}
                >
                  {video.title}
                </Link>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-gray-900">{video.clicks}</p>
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
 * Async server component that fetches and displays popular videos widget
 */
export async function PopularVideosWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = getAnalyticsDateParams(searchParams)

  const popularVideos = await fetchPopularVideosData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <SimplePopularVideosWidget
      dateRange={dateRange}
      selectedDate={selectedDate}
      videos={popularVideos}
    />
  )
}

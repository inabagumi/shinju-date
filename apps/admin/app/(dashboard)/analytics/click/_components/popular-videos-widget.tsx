import Link from 'next/link'
import { cache } from 'react'
import type { PopularVideo } from '@/lib/analytics/get-popular-videos'
import { getPopularVideos } from '@/lib/analytics/get-popular-videos'
import { ExportMenu } from '../../_components/export-menu'
import { RankingTable } from '../../_components/ranking-table'
import { WidgetHeader } from '../../_components/widget-header'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
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
  videos: PopularVideo[]
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  return (
    <div>
      <WidgetHeader
        actions={
          <ExportMenu
            dateRange={dateRange}
            selectedDate={selectedDate}
            type="videos"
          />
        }
        dateRange={dateRange}
        description="最もクリックされている動画のランキング。ユーザーの興味を把握できます。"
        selectedDate={selectedDate}
        title="人気動画ランキング"
      />
      <RankingTable
        items={videos.map((video) => ({
          key: video.id,
          label: (
            <Link
              className="text-accent hover:underline"
              href={`/videos/${video.id}`}
            >
              {video.title}
            </Link>
          ),
          value: video.clicks,
        }))}
        labelHeading="動画"
        valueHeading="クリック数"
      />
    </div>
  )
}

/**
 * Async server component that fetches and displays popular videos widget
 */
export async function PopularVideosWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

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

import { TIME_ZONE } from '@shinju-date/constants'
import { formatNumber } from '@shinju-date/helpers'
import { Button, EmptyState } from '@shinju-date/ui'
import { ExternalLink } from 'lucide-react'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import {
  ExternalVideoLink,
  getExternalVideoUrl,
} from '@/components/external-video-link'
import { Panel } from '@/components/panel'
import { PopularVideosListSkeleton } from '@/components/skeletons'
import { VideoThumbnail } from '@/components/video-thumbnail'
import { getPopularVideos } from '@/lib/analytics/get-popular-videos'

export function DashboardPopularVideosSkeleton() {
  return (
    <Panel>
      <div className="mb-4 h-7 w-64 animate-pulse rounded-control bg-muted" />
      <PopularVideosListSkeleton />
    </Panel>
  )
}

/**
 * DashboardPopularVideos - Displays popular videos ranking
 * This is an async Server Component that fetches its own data
 */
export async function DashboardPopularVideos() {
  'use cache: private'

  cacheLife('minutes')

  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 29 })
  const popularVideos = await getPopularVideos(10, startDate, today)

  return (
    <Panel title="人気動画ランキング (過去30日間)">
      {popularVideos.length > 0 ? (
        <ol className="divide-y divide-border">
          {popularVideos.map((video, index) => (
            <li className="flex items-center gap-4 py-3" key={video.id}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-meta font-semibold text-muted tabular-nums">
                {index + 1}
              </div>
              <VideoThumbnail size="md" thumbnail={video.thumbnail} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body leading-normal font-semibold">
                  {video.title}
                </p>
                <p className="text-meta text-muted tabular-nums">
                  クリック数: {formatNumber(video.clicks)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/videos/${video.id}`}>詳細</Link>
                </Button>
                {getExternalVideoUrl(video) && (
                  <ExternalVideoLink
                    className="flex items-center justify-center rounded-control border border-border bg-surface p-1 text-muted focus-ring transition-colors hover:bg-muted hover:text-foreground"
                    video={video}
                  >
                    <ExternalLink aria-hidden="true" className="size-5" />
                    <span className="sr-only">
                      {video.platform === 'twitch'
                        ? 'Twitchで視聴'
                        : 'YouTubeで視聴'}
                    </span>
                  </ExternalVideoLink>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="データがありません" />
      )}
    </Panel>
  )
}

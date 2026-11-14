import { TIME_ZONE } from '@shinju-date/constants'
import { formatNumber } from '@shinju-date/helpers'
import { Button, EmptyState } from '@shinju-date/ui'
import { ExternalLink } from 'lucide-react'
import { cacheLife } from 'next/cache'
import Image from 'next/image'
import Link from 'next/link'
import { PopularVideosListSkeleton } from '@/components/skeletons'
import { getPopularVideos } from '@/lib/analytics/get-popular-videos'

export function PopularVideosWidgetSkeleton() {
  return (
    <div className="rounded-container border border-border bg-surface p-6">
      <div className="mb-4 h-7 w-64 animate-pulse rounded-control bg-muted" />
      <PopularVideosListSkeleton />
    </div>
  )
}

/**
 * PopularVideosWidget - Displays popular videos ranking
 * This is an async Server Component that fetches its own data
 */
export async function PopularVideosWidget() {
  'use cache: private'

  cacheLife('minutes')

  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 29 })
  const popularVideos = await getPopularVideos(10, startDate, today)

  return (
    <section className="rounded-container border border-border bg-surface p-6">
      <h2 className="mb-4 text-heading font-bold">
        人気動画ランキング (過去30日間)
      </h2>
      {popularVideos.length > 0 ? (
        <ol className="divide-y divide-border">
          {popularVideos.map((video, index) => (
            <li className="flex items-center gap-4 py-3" key={video.id}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-meta font-semibold text-muted tabular-nums">
                {index + 1}
              </div>
              {video.thumbnail ? (
                <div className="relative h-16 w-28 shrink-0">
                  <Image
                    alt=""
                    blurDataURL={video.thumbnail.blur_data_url}
                    className="rounded-container object-cover"
                    fill
                    placeholder="blur"
                    sizes="112px"
                    src={`/images/thumbnails/${video.thumbnail.id}`}
                  />
                </div>
              ) : (
                <div className="h-16 w-28 shrink-0 rounded-container bg-muted" />
              )}
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
                {video.youtube_video?.youtube_video_id && (
                  <a
                    className="flex items-center justify-center rounded-control border border-border bg-surface p-1 text-muted transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    href={`https://www.youtube.com/watch?v=${video.youtube_video.youtube_video_id}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" className="size-5" />
                    <span className="sr-only">YouTubeで視聴</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="データがありません" />
      )}
    </section>
  )
}

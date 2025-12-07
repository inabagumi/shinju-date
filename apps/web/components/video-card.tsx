import { TIME_ZONE } from '@shinju-date/constants'
import { formatDuration } from '@shinju-date/temporal-fns'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { twMerge } from 'tailwind-merge'
import { Temporal } from 'temporal-polyfill'
import type { Video } from '@/lib/fetchers'
import FormattedTime from './formatted-time'
import LiveNow from './live-now'

interface YouTubeVideo extends Omit<Video, 'youtube_video'> {
  youtube_video: NonNullable<Video['youtube_video']>
}

function getThumbnailURL(
  video: YouTubeVideo,
): [src: string, blurDataURL: string] | null {
  if (!video.thumbnail) {
    return null
  }

  return [
    `/images/thumbnails/${video.thumbnail.id}`,
    video.thumbnail.blur_data_url,
  ]
}

/**
 * サムネイルが存在しない場合のプレースホルダー
 */
function ThumbnailPlaceholder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600">
      <ImageIcon className="h-12 w-12" strokeWidth={1} />
    </div>
  )
}

function Thumbnail({ video }: { video: YouTubeVideo }) {
  const thumbnailData = getThumbnailURL(video)

  if (!thumbnailData) {
    return <ThumbnailPlaceholder />
  }

  const [publicURL, blurDataURL] = thumbnailData

  return (
    <Image
      alt=""
      blurDataURL={blurDataURL ?? ''}
      className="object-cover object-center"
      fill
      placeholder={blurDataURL ? 'blur' : 'empty'}
      sizes="(max-width: 996px) 100vw, 30vw"
      src={publicURL}
    />
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-774-nevy-200 bg-774-nevy-100 shadow dark:border-zinc-800 dark:bg-zinc-800 dark:shadow-none">
      <div className="relative aspect-video">
        <div className="h-full animate-pulse bg-774-nevy-200 dark:bg-zinc-700" />
      </div>

      <div className="grid grow grid-rows-[1fr_auto] gap-6 p-2.5">
        <h3 className="break-all font-semibold">
          <span className="inline-block h-4 w-full animate-pulse rounded-md bg-774-nevy-200 dark:bg-zinc-700" />
          <span className="inline-block h-4 w-full animate-pulse rounded-md bg-774-nevy-200 dark:bg-zinc-700" />
          <span className="inline-block h-4 w-28 animate-pulse rounded-md bg-774-nevy-200 dark:bg-zinc-700" />
        </h3>

        <div className="text-right text-sm">
          <span className="inline-block h-3 w-24 animate-pulse rounded-md bg-774-nevy-200 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  )
}

export default function VideoCard({
  className,
  compact = false,
  dateTimeFormatOptions = {
    dateStyle: undefined,
    timeStyle: 'short',
  },
  style,
  value,
}: {
  className?: string
  compact?: boolean
  dateTimeFormatOptions?: Pick<
    Intl.DateTimeFormatOptions,
    'dateStyle' | 'timeStyle'
  >
  style?: React.CSSProperties
  value: Video
}) {
  const publishedAt = Temporal.Instant.from(
    value.published_at,
  ).toZonedDateTimeISO(TIME_ZONE)
  const duration = Temporal.Duration.from(value?.duration ?? 'P0D')

  if (!value.youtube_video) {
    return null
  }

  return (
    <a
      className={twMerge(
        'flex flex-col overflow-hidden rounded-xl border border-774-nevy-200 bg-774-nevy-100 shadow hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-800 dark:shadow-none',
        className,
      )}
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(
        value.youtube_video.youtube_video_id,
      )}`}
      ping="/api/ping"
      rel="noopener noreferrer"
      style={style}
      target="_blank"
    >
      <div className="relative aspect-video">
        <Thumbnail video={value as YouTubeVideo} />

        {duration.total({
          unit: 'second',
        }) > 0 && (
          <span className="absolute bottom-0 left-0 m-2 inline-block rounded-md bg-slate-800/80 px-1.5 py-0.5 font-semibold text-white text-xs">
            <time dateTime={duration.toString()}>
              {formatDuration(duration)}
            </time>
          </span>
        )}
        <LiveNow
          className="absolute top-0 right-0 m-2 inline-block rounded-md bg-774-pink-600 px-1.5 py-0.5 font-semibold text-774-pink-50 text-xs"
          status={value.status}
        />
      </div>

      <div className="grid grow grid-rows-[1fr_auto] gap-6 p-2.5">
        <h3
          className={twMerge(
            'line-clamp-3 break-all font-semibold',
            compact && 'line-clamp-2 text-sm',
          )}
          title={value.title}
        >
          {value.title}
        </h3>

        <div className={twMerge('text-right text-sm', compact && 'text-xs')}>
          <FormattedTime
            dateTime={publishedAt}
            options={dateTimeFormatOptions}
          />
        </div>
      </div>
    </a>
  )
}

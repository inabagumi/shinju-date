import Image from 'next/image'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'
import { type Video } from '@/lib/fetchers'
import { supabaseClient } from '@/lib/supabase'
import FormattedTime from './formatted-time'
import LiveNow from './live-now'

function getThumbnailURL({
  slug,
  thumbnail
}: Video): [src: string, blurDataURL: string | undefined] {
  if (!thumbnail) {
    return [`https://i.ytimg.com/vi/${slug}/maxresdefault.jpg`, undefined]
  }

  const {
    data: { publicUrl: url }
  } = supabaseClient.storage.from('thumbnails').getPublicUrl(thumbnail.path)

  return [url, thumbnail?.blur_data_url]
}

function formatDuration(duration: Temporal.Duration): string {
  return [duration.hours, duration.minutes, duration.seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

function Thumbnail({ video }: { video: Video }) {
  const [publicURL, blurDataURL] = getThumbnailURL(video)

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
        <h3 className="font-semibold break-all">
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
  dateTimeFormatOptions = { dateStyle: undefined, timeStyle: 'short' },
  value
}: {
  dateTimeFormatOptions?: Pick<
    Intl.DateTimeFormatOptions,
    'dateStyle' | 'timeStyle'
  >
  value: Video
}) {
  const publishedAt = Temporal.Instant.from(
    value.published_at
  ).toZonedDateTimeISO(timeZone)
  const duration = Temporal.Duration.from(value?.duration ?? 'P0D')

  return (
    <a
      className="flex flex-col overflow-hidden rounded-xl border border-774-nevy-200 bg-774-nevy-100 shadow hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-800 dark:shadow-none"
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(value.slug)}`}
      ping="/api/ping"
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="relative aspect-video">
        <Thumbnail video={value} />

        {duration.total({ unit: 'second' }) > 0 && (
          <span className="absolute bottom-0 left-0 m-2 inline-block rounded-md bg-slate-800/80 px-1.5 py-0.5 text-xs font-semibold text-white">
            <time dateTime={duration.toString()}>
              {formatDuration(duration)}
            </time>
          </span>
        )}
        <LiveNow
          className="absolute top-0 right-0 m-2 inline-block rounded-md bg-774-pink-600 px-1.5 py-0.5 text-xs font-semibold text-774-pink-50"
          duration={duration}
          publishedAt={publishedAt}
        />
      </div>

      <div className="grid grow grid-rows-[1fr_auto] gap-6 p-2.5">
        <h3
          className="line-clamp-3 font-semibold break-all"
          title={value.title}
        >
          {value.title}
        </h3>

        <div className="text-right text-sm">
          <FormattedTime
            dateTime={publishedAt}
            options={dateTimeFormatOptions}
          />
        </div>
      </div>
    </a>
  )
}

'use client'

import { Temporal } from '@js-temporal/polyfill'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { timeZone } from '@/lib/constants'
import { type Video } from '@/lib/fetchers'
import { supabaseClient } from '@/lib/supabase'

function formatDuration(duration: Temporal.Duration): string {
  return [duration.hours, duration.minutes, duration.seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

function Thumbnail({ video: { slug, thumbnails } }: { video: Video }) {
  const thumbnail = useMemo(
    () => (Array.isArray(thumbnails) ? thumbnails[0] : thumbnails),
    [thumbnails]
  )
  const publicURL = useMemo(() => {
    if (!thumbnail) {
      return `https://i.ytimg.com/vi/${slug}/maxresdefault.jpg`
    }

    const {
      data: { publicUrl: url }
    } = supabaseClient.storage.from('thumbnails').getPublicUrl(thumbnail.path)

    return url
  }, [thumbnail, slug])

  return (
    <Image
      alt=""
      blurDataURL={thumbnail?.blur_data_url}
      className="object-cover object-center"
      fill
      placeholder={thumbnail ? 'blur' : undefined}
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
  const [now] = useState(() => Temporal.Now.zonedDateTimeISO(timeZone))
  const publishedAt = useMemo(
    () =>
      Temporal.Instant.from(value.published_at).toZonedDateTimeISO(timeZone),
    [value.published_at]
  )
  const duration = useMemo(
    () => Temporal.Duration.from(value?.duration ?? 'P0D'),
    [value?.duration]
  )
  const [liveNow, setLiveNow] = useState(false)

  useEffect(() => {
    setLiveNow(
      () =>
        Temporal.ZonedDateTime.compare(publishedAt, now) < 1 &&
        Temporal.ZonedDateTime.compare(now, publishedAt.add({ hours: 12 })) <
          1 &&
        duration.total({ unit: 'second' }) < 1 &&
        publishedAt.second > 0
    )
  }, [now, publishedAt, duration])

  return (
    <a
      className="flex flex-col overflow-hidden rounded-xl border border-774-nevy-200 bg-774-nevy-100 shadow hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-800 dark:shadow-none"
      href={value.url}
      ping="/ping"
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="relative aspect-video">
        <Thumbnail video={value} />

        {duration.total({ unit: 'second' }) > 0 && (
          <span className="absolute bottom-0 left-0 m-2 inline-block rounded-md bg-slate-800/80 py-0.5 px-1.5 text-xs font-semibold text-white">
            <time dateTime={duration.toString()}>
              {formatDuration(duration)}
            </time>
          </span>
        )}
        {liveNow && (
          <span className="absolute top-0 right-0 m-2 inline-block rounded-md bg-secondary-pink py-0.5 px-1.5 text-xs font-semibold text-white">
            ライブ配信中
          </span>
        )}
      </div>

      <div className="grid grow grid-rows-[1fr_auto] gap-6 p-2.5">
        <h3
          className="line-clamp-3 font-semibold break-all"
          title={value.title}
        >
          {value.title}
        </h3>

        <div className="text-right text-sm">
          <time
            dateTime={publishedAt.toString({ timeZoneName: 'never' })}
            title={publishedAt.toLocaleString('ja-JP', {
              dateStyle: 'short',
              timeStyle: 'medium'
            })}
          >
            {publishedAt.toLocaleString('ja-JP', {
              day: dateTimeFormatOptions.dateStyle ? '2-digit' : undefined,
              hour: dateTimeFormatOptions.timeStyle ? '2-digit' : undefined,
              minute: dateTimeFormatOptions.timeStyle ? '2-digit' : undefined,
              month: dateTimeFormatOptions.dateStyle ? '2-digit' : undefined,
              second:
                dateTimeFormatOptions.timeStyle &&
                dateTimeFormatOptions.timeStyle !== 'short'
                  ? '2-digit'
                  : undefined,
              year:
                dateTimeFormatOptions.dateStyle && now.year !== publishedAt.year
                  ? 'numeric'
                  : undefined
            })}
          </time>
        </div>
      </div>
    </a>
  )
}

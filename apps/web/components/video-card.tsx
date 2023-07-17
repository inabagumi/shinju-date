'use client'

import { Temporal } from '@js-temporal/polyfill'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { type Video } from '@/lib/fetchers'
import { supabase } from '@/lib/supabase'
import Skeleton from './skeleton'
import styles from './video-card.module.css'

function formatDuration(duration: Temporal.Duration): string {
  return [duration.hours, duration.minutes, duration.seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

type ThumbnailProps = {
  video: Video
}

function Thumbnail({ video }: ThumbnailProps): JSX.Element | null {
  const thumbnail = useMemo(
    () =>
      Array.isArray(video.thumbnails) ? video.thumbnails[0] : video.thumbnails,
    [video.thumbnails]
  )
  const publicURL = useMemo(() => {
    if (!thumbnail) {
      return null
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from('thumbnails').getPublicUrl(thumbnail.path)

    return publicUrl
  }, [thumbnail])

  if (!thumbnail || !publicURL) {
    return null
  }

  return (
    <Image
      alt=""
      blurDataURL={thumbnail.blur_data_url}
      className={styles.thumbnail}
      fill
      placeholder="blur"
      sizes="(max-width: 996px) 100vw, 30vw"
      src={publicURL}
    />
  )
}

export function VideoCardSkeleton(): JSX.Element {
  return (
    <div className={styles.blockLink}>
      <div className={clsx('card', styles.video)}>
        <div className={clsx('card__image', styles.image)}>
          <Skeleton className={styles.thumbnailSkeleton} variant="rect" />
        </div>

        <div className="card__body">
          <h3 className={styles.title}>
            <Skeleton className={styles.titleSkeleton} variant="text" />
            <Skeleton className={styles.titleSkeleton} variant="text" />
          </h3>
        </div>

        <div className="card__footer">
          <span className={styles.published}>
            <Skeleton variant="text" />
          </span>
        </div>
      </div>
    </div>
  )
}

type Props = {
  dateTimeFormatOptions?: Pick<
    Intl.DateTimeFormatOptions,
    'dateStyle' | 'timeStyle'
  >
  value: Video
}

export default function VideoCard({
  dateTimeFormatOptions = { dateStyle: undefined, timeStyle: 'short' },
  value
}: Props): JSX.Element {
  const [now] = useState(() => Temporal.Now.zonedDateTimeISO('Asia/Tokyo'))
  const publishedAt = useMemo(
    () =>
      Temporal.Instant.from(value.published_at).toZonedDateTimeISO(
        'Asia/Tokyo'
      ),
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
      className={styles.blockLink}
      href={value.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className={clsx('card', styles.video)}>
        <div className={clsx('card__image', styles.image)}>
          <Thumbnail video={value} />

          {duration.total({ unit: 'second' }) > 0 ? (
            <span className={clsx('badge', styles.duration)}>
              <time dateTime={duration.toString()}>
                {formatDuration(duration)}
              </time>
            </span>
          ) : liveNow ? (
            <span className={clsx('badge', styles.liveNow)}>ライブ配信中</span>
          ) : null}
        </div>

        <div className="card__body">
          <h3 className={styles.title}>{value.title}</h3>
        </div>

        <div className="card__footer">
          <time
            className={styles.published}
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

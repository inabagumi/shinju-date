'use client'

import { useQuery } from '@tanstack/react-query'
import groupBy from 'lodash.groupby'
import { useMemo } from 'react'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'
import { type Channel, fetchNotEndedVideos, type Video } from '@/lib/fetchers'
import VideoCardList, { VideoCardListSkeleton } from './video-card-list'

function TimelineSection({
  dateTime: rawDateTime,
  items,
}: {
  dateTime: string
  items: Video[]
}) {
  const dateTime = useMemo(
    () => Temporal.PlainDate.from(rawDateTime),
    [rawDateTime],
  )

  return (
    <section className="space-y-6">
      <h2 className="text-right font-bold text-2xl">
        <time dateTime={dateTime.toJSON()}>
          {dateTime.toLocaleString('ja-JP', {
            dateStyle: 'short',
            timeZone,
          })}
        </time>
      </h2>

      <VideoCardList values={items} />
    </section>
  )
}

export function TimelineSkeleton() {
  return (
    <section className="space-y-6">
      <h2 className="text-right font-bold text-2xl">
        <span className="inline-block h-6 w-32 animate-pulse rounded-md bg-774-nevy-100" />
      </h2>

      <VideoCardListSkeleton />
    </section>
  )
}

export default function Timeline({
  channels,
  prefetchedData,
}: {
  channels?: Channel[]
  prefetchedData: Video[]
}) {
  const { data: videos = prefetchedData } = useQuery({
    initialData: prefetchedData,
    queryFn: () =>
      fetchNotEndedVideos({
        channelIDs: channels?.map((channel) => channel.slug),
      }),
    queryKey: [
      'not-ended-videos',
      { channelIDs: channels?.map((channel) => channel.slug) },
    ],
    refetchInterval: 60_000,
  })
  const schedule = useMemo<Record<string, Video[]>>(() => {
    const sortedValues = [...videos].sort((videoA, videoB) =>
      Temporal.Instant.compare(
        Temporal.Instant.from(videoA.published_at),
        Temporal.Instant.from(videoB.published_at),
      ),
    )
    return groupBy(sortedValues, (value) =>
      Temporal.Instant.from(value.published_at)
        .toZonedDateTimeISO(timeZone)
        .toPlainDate()
        .toJSON(),
    )
  }, [videos])

  return (
    <div className="space-y-20">
      {Object.entries(schedule).map(([dateTime, items]) => (
        <TimelineSection dateTime={dateTime} items={items} key={dateTime} />
      ))}
    </div>
  )
}

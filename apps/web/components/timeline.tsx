'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode, useId, useMemo } from 'react'
import { fetchUpcomingVideos, type Video } from '@/lib/fetchers'
import VideoCardList, { VideoCardListSkeleton } from './video-card-list'

interface TimelineGroupProps {
  children: ReactNode
  heading: ReactNode
  labelledBy?: string | undefined
}

/**
 * 日付グループを縦のレール（タイムライン）でまとめ、
 * 日付見出しをカードグリッドの開始位置に揃えて表示する。
 * どの画面幅でも「日付 → 所属するカード」の順に並ぶため、
 * 1件のみのグループでも見出しとカードが離れない。
 */
function TimelineGroup({ children, heading, labelledBy }: TimelineGroupProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative border-l-2 border-774-nevy-200 pb-2 pl-5 sm:pl-8 dark:border-zinc-700"
      data-testid="timeline-group"
    >
      <span
        aria-hidden="true"
        className="absolute top-2.5 -left-1.75 size-3 rounded-full bg-774-pink-600 ring-4 ring-primary-foreground dark:ring-zinc-900"
      />

      <header className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {heading}
      </header>

      {children}
    </section>
  )
}

function TimelineSection({
  dateTime: rawDateTime,
  items,
}: {
  dateTime: string
  items: Video[]
}) {
  const headingId = useId()
  const dateTime = useMemo(
    () => Temporal.PlainDate.from(rawDateTime),
    [rawDateTime],
  )

  return (
    <TimelineGroup
      heading={
        <>
          <h2 className="text-2xl font-bold" id={headingId}>
            <time dateTime={dateTime.toJSON()}>
              {dateTime.toLocaleString('ja-JP', {
                day: '2-digit',
                month: '2-digit',
                timeZone: TIME_ZONE,
                weekday: 'short',
                year: 'numeric',
              })}
            </time>
          </h2>
          <p className="text-sm text-774-nevy-500 dark:text-774-nevy-400">
            {items.length}件
          </p>
        </>
      }
      labelledBy={headingId}
    >
      <VideoCardList values={items} />
    </TimelineGroup>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-16">
      <TimelineGroup
        heading={
          <span className="inline-block h-8 w-44 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
        }
      >
        <VideoCardListSkeleton />
      </TimelineGroup>
    </div>
  )
}

export default function Timeline({
  prefetchedData,
}: {
  prefetchedData: Video[]
}) {
  const { data: videos = prefetchedData } = useQuery({
    initialData: prefetchedData,
    queryFn: () => fetchUpcomingVideos(),
    queryKey: ['upcoming-videos'],
    refetchInterval: 60_000,
  })
  const schedule = useMemo<Map<string, Video[]>>(() => {
    const sortedValues = (videos ?? []).toSorted((videoA, videoB) =>
      Temporal.Instant.compare(
        Temporal.Instant.from(videoA.published_at),
        Temporal.Instant.from(videoB.published_at),
      ),
    )
    return Map.groupBy(sortedValues, (value) =>
      Temporal.Instant.from(value.published_at)
        .toZonedDateTimeISO(TIME_ZONE)
        .toPlainDate()
        .toJSON(),
    )
  }, [videos])

  return (
    <div className="space-y-16">
      {[...schedule.entries()].map(([dateTime, items]) => (
        <TimelineSection dateTime={dateTime} items={items} key={dateTime} />
      ))}
    </div>
  )
}

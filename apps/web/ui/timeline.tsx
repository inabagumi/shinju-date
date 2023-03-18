'use client'

import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { useMemo } from 'react'
import useSWR from 'swr'
import { type Video } from '@/lib/algolia'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import Skeleton from './skeleton'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function TimelineSkeleton(): JSX.Element {
  return (
    <section className="margin-top--lg section">
      <h2 className="margin-bottom--lg text--right">
        <Skeleton variant="text" />
      </h2>

      <div className="container">
        <div className="row">
          <div className="col col--4 padding-bottom--lg padding-horiz--sm">
            <VideoCardSkeleton />
          </div>
          <div className="col col--4 padding-bottom--lg padding-horiz--sm">
            <VideoCardSkeleton />
          </div>
        </div>
      </div>
    </section>
  )
}

type Channel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'id' | 'name' | 'slug'
>

type Props = {
  channels?: Channel[]
  prefetchedData: Video[]
}

export default function Timeline({
  channels = [],
  prefetchedData
}: Props): JSX.Element {
  const { data: videos } = useSWR(
    {
      channelIDs: channels.map((channel) => channel.slug)
    },
    fetchNotEndedVideos,
    {
      fallbackData: prefetchedData,
      refreshInterval: 60_000
    }
  )
  const schedule = useMemo<Map<Temporal.PlainDate, Video[]>>(() => {
    const sortedValues = [...videos].sort((videoA, videoB) =>
      Temporal.Instant.compare(
        Temporal.Instant.fromEpochSeconds(videoA.publishedAt),
        Temporal.Instant.fromEpochSeconds(videoB.publishedAt)
      )
    )
    const groupedValues = groupBy(sortedValues, (value) =>
      Temporal.Instant.fromEpochSeconds(value.publishedAt)
        .toZonedDateTimeISO('Asia/Tokyo')
        .toPlainDate()
        .toJSON()
    )
    const groupedMap = new Map<Temporal.PlainDate, Video[]>()

    for (const [key, values] of Object.entries(groupedValues)) {
      groupedMap.set(Temporal.PlainDate.from(key), values)
    }

    return groupedMap
  }, [videos])

  return (
    <>
      {Array.from(schedule.entries()).map(([dateTime, items]) => (
        <section className="margin-top--lg section" key={dateTime.toJSON()}>
          <h2 className="margin-bottom--lg text--right">
            <time dateTime={dateTime.toJSON()}>
              {dateTime.toLocaleString('ja-JP', {
                dateStyle: 'short',
                timeStyle: undefined,
                timeZone: 'Asia/Tokyo'
              })}
            </time>
          </h2>

          <div className="container">
            {chunk(items, 3).map((values) => (
              <div
                className="row"
                key={`items:[${values.map((value) => value.id).join(',')}]`}
              >
                {values.map((value) => (
                  <div
                    className="col col--4 padding-bottom--lg padding-horiz--sm"
                    key={value.id}
                  >
                    <VideoCard value={value} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

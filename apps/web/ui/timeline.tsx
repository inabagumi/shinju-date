'use client'

import { Temporal } from '@js-temporal/polyfill'
import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { useMemo } from 'react'
import useSWR from 'swr'
import { type Channel, type Video, fetchNotEndedVideos } from '@/lib/fetchers'
import Skeleton from './skeleton'
import VideoCard, { VideoCardSkeleton } from './video-card'

type TimelineSectionProps = {
  dateTime: string
  items: Video[]
}

function TimelineSection({
  dateTime: rawDateTime,
  items
}: TimelineSectionProps): JSX.Element {
  const dateTime = useMemo(
    () => Temporal.PlainDate.from(rawDateTime),
    [rawDateTime]
  )

  return (
    <section className="margin-top--lg section">
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
            key={`items:[${values.map((value) => value.slug).join(',')}]`}
          >
            {values.map((value) => (
              <div
                className="col col--4 padding-bottom--lg padding-horiz--sm"
                key={value.slug}
              >
                <VideoCard value={value} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

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

type Props = {
  channels?: Channel[]
  prefetchedData: Video[]
}

export default function Timeline({
  channels,
  prefetchedData
}: Props): JSX.Element {
  const { data: videos } = useSWR(
    {
      channelIDs: channels && channels.map((channel) => channel.slug)
    },
    fetchNotEndedVideos,
    {
      fallbackData: prefetchedData,
      refreshInterval: 60_000
    }
  )
  const schedule = useMemo<Record<string, Video[]>>(() => {
    const sortedValues = [...videos].sort((videoA, videoB) =>
      Temporal.Instant.compare(
        Temporal.Instant.from(videoA.published_at),
        Temporal.Instant.from(videoB.published_at)
      )
    )
    return groupBy(sortedValues, (value) =>
      Temporal.Instant.from(value.published_at)
        .toZonedDateTimeISO('Asia/Tokyo')
        .toPlainDate()
        .toJSON()
    )
  }, [videos])

  return (
    <>
      {Object.entries(schedule).map(([dateTime, items]) => (
        <TimelineSection dateTime={dateTime} items={items} key={dateTime} />
      ))}
    </>
  )
}

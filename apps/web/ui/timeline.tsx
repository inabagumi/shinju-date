'use client'

import { type Database } from '@shinju-date/schema'
import { Temporal } from '@js-temporal/polyfill'
import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { useMemo } from 'react'
import { FormattedDate, useIntl } from 'react-intl'
import useSWR from 'swr'
import { type Video } from '@/lib/algolia'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import Skeleton from './skeleton'
import VideoCard from './video-card'

type BuildScheduleMapOptions = {
  timeZone: Temporal.TimeZone
}

const buildScheduleMap = (
  values: Video[],
  { timeZone }: BuildScheduleMapOptions
): Record<string, Video[]> => {
  values.sort((videoA, videoB) =>
    Temporal.Instant.compare(
      Temporal.Instant.fromEpochSeconds(videoA.publishedAt),
      Temporal.Instant.fromEpochSeconds(videoB.publishedAt)
    )
  )

  return groupBy(values, (value) => {
    const publishedAt = Temporal.Instant.fromEpochSeconds(
      value.publishedAt
    ).toZonedDateTimeISO(timeZone)
    const publishedDate = publishedAt.toPlainDate()

    return publishedDate.toString()
  })
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
  const intl = useIntl()
  const schedule = useMemo(() => {
    const timeZone = new Temporal.TimeZone(intl.timeZone ?? 'UTC')

    return buildScheduleMap(videos, { timeZone })
  }, [videos, intl.timeZone])

  return (
    <>
      {Object.entries(schedule).map(([dateTime, items]) => (
        <section className="margin-top--lg section" key={dateTime}>
          <h2 className="margin-bottom--lg text--right">
            <time dateTime={dateTime}>
              <FormattedDate
                day="2-digit"
                month="2-digit"
                value={dateTime}
                year="numeric"
              />
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

export function TimelineSkeleton(): JSX.Element {
  return (
    <section className="margin-top--lg section">
      <h2 className="margin-bottom--lg text--right">
        <Skeleton variant="text" />
      </h2>

      <div className="container">
        <div className="row">
          <div className="col col--4 padding-bottom--lg padding-horiz--sm">
            <VideoCard />
          </div>
          <div className="col col--4 padding-bottom--lg padding-horiz--sm">
            <VideoCard />
          </div>
        </div>
      </div>
    </section>
  )
}

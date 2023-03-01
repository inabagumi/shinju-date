import { Temporal } from '@js-temporal/polyfill'
import {
  type EventAttributes,
  convertTimestampToArray,
  createEvents
} from 'ics'
import { NextResponse } from 'next/server'
import { type Video } from './algolia'
import { max, min } from './date'

type GetPublishedAtAndEndedAtOptions = {
  now: Temporal.ZonedDateTime
}

type GetPublishedAtAndEndedAtResult = [
  publishedAt: Temporal.ZonedDateTime,
  endedAt: Temporal.ZonedDateTime
]

export function getPublishedAtAndEndedAt(
  video: Video,
  { now }: GetPublishedAtAndEndedAtOptions
): GetPublishedAtAndEndedAtResult {
  const publishedAt = Temporal.Instant.fromEpochSeconds(
    video.publishedAt
  ).toZonedDateTimeISO(now.timeZone)
  const duration = Temporal.Duration.from(video.duration ?? 'P0D')
  const endedAt =
    duration.total({ unit: 'second' }) > 0
      ? publishedAt.add(duration)
      : min(
          max(publishedAt.add({ hours: 1 }), now.add({ minutes: 30 })),
          publishedAt.add({ hours: 12 })
        )

  return [publishedAt, endedAt]
}

export function createCalendarResponse(
  events: EventAttributes[]
): NextResponse {
  const { error, value } = createEvents(events)

  if (error && !value) {
    return new NextResponse('500 Internal Server Error\n', {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 500
    })
  }

  return new NextResponse(value, {
    headers: {
      'Content-Type': 'text/calendar; charset=UTF-8'
    }
  })
}

type CreateEventAttributesListOptions = {
  now: Temporal.ZonedDateTime
}

export function createEventAttributesList(
  videos: Video[],
  { now }: CreateEventAttributesListOptions
): EventAttributes[] {
  return videos.map((video): EventAttributes => {
    const [publishedAt, endedAt] = getPublishedAtAndEndedAt(video, { now })

    return {
      calName: video.channel.title,
      description: video.url,
      end: convertTimestampToArray(endedAt.epochMilliseconds, 'utc'),
      endInputType: 'utc',
      endOutputType: 'utc',
      location: 'YouTube',
      productId: 'SHINJU DATE',
      start: convertTimestampToArray(publishedAt.epochMilliseconds, 'utc'),
      startInputType: 'utc',
      startOutputType: 'utc',
      title: video.title,
      uid: `${video.id}@shinju.date`,
      url: video.url
    }
  })
}

export function createNotFoundResponse(): NextResponse {
  return new NextResponse('404 Not Found\n', {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=UTF-8'
    },
    status: 404
  })
}

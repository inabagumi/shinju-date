import { Temporal } from '@js-temporal/polyfill'
import {
  type EventAttributes,
  convertTimestampToArray,
  createEvents
} from 'ics'
import { title as siteName } from '@/lib/constants'
import { max, min } from './date'

type Channel = {
  name: string
}

type Video = {
  channels: Channel[] | Channel | null
  duration: string
  published_at: string
  slug: string
  title: string
  url: string
}

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
  const publishedAt = Temporal.Instant.from(
    video.published_at
  ).toZonedDateTimeISO(now.timeZoneId)
  const duration = Temporal.Duration.from(video.duration)
  const endedAt =
    duration.total({ unit: 'second' }) > 0
      ? publishedAt.add(duration)
      : min(
          max(publishedAt.add({ hours: 1 }), now.add({ minutes: 30 })),
          publishedAt.add({ hours: 12 })
        )

  return [publishedAt, endedAt]
}

export function createCalendarResponse(events: EventAttributes[]): Response {
  const { error, value } = createEvents(events)

  if (error && !value) {
    return new Response('500 Internal Server Error\n', {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 500
    })
  }

  return new Response(value, {
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
    const channel = Array.isArray(video.channels)
      ? video.channels[0]
      : video.channels

    return {
      calName: channel?.name,
      description: video.url,
      end: convertTimestampToArray(endedAt.epochMilliseconds, 'utc'),
      endInputType: 'utc',
      endOutputType: 'utc',
      location: 'YouTube',
      productId: siteName,
      start: convertTimestampToArray(publishedAt.epochMilliseconds, 'utc'),
      startInputType: 'utc',
      startOutputType: 'utc',
      title: video.title,
      uid: `${video.slug}@shinju.date`,
      url: video.url
    }
  })
}

export function createNotFoundResponse(): Response {
  return new Response('404 Not Found\n', {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=UTF-8'
    },
    status: 404
  })
}

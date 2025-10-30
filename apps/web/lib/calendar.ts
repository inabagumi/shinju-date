import type { Tables } from '@shinju-date/database'
import { max, min } from '@shinju-date/temporal-fns'
import {
  convertTimestampToArray,
  createEvents,
  type EventAttributes,
} from 'ics'
import { Temporal } from 'temporal-polyfill'
import { title as siteName } from '@/lib/constants'

type Channel = Pick<Tables<'channels'>, 'name'>

type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'title'
> & {
  channel: Channel
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'>
}

type GetPublishedAtAndEndedAtOptions = {
  now: Temporal.ZonedDateTime
}

type GetPublishedAtAndEndedAtResult = [
  publishedAt: Temporal.ZonedDateTime,
  endedAt: Temporal.ZonedDateTime,
]

export function getPublishedAtAndEndedAt(
  video: Video,
  { now }: GetPublishedAtAndEndedAtOptions,
): GetPublishedAtAndEndedAtResult {
  const publishedAt = Temporal.Instant.from(
    video.published_at,
  ).toZonedDateTimeISO(now.timeZoneId)
  const duration = Temporal.Duration.from(video.duration)
  const endedAt =
    duration.total({
      unit: 'second',
    }) > 0
      ? publishedAt.add(duration)
      : min(
          max(
            publishedAt.add({
              hours: 1,
            }),
            now.add({
              minutes: 30,
            }),
          ),
          publishedAt.add({
            hours: 12,
          }),
        )

  return [publishedAt, endedAt]
}

export function createCalendarResponse(events: EventAttributes[]): Response {
  const { error, value } = createEvents(events)

  if (error && !value) {
    return new Response('500 Internal Server Error\n', {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=UTF-8',
      },
      status: 500,
    })
  }

  return new Response(value, {
    headers: {
      'Content-Type': 'text/calendar; charset=UTF-8',
    },
  })
}

type CreateEventAttributesListOptions = {
  now: Temporal.ZonedDateTime
}

export function createEventAttributesList(
  videos: Video[],
  { now }: CreateEventAttributesListOptions,
): EventAttributes[] {
  return videos.map((video): EventAttributes => {
    const [publishedAt, endedAt] = getPublishedAtAndEndedAt(video, {
      now,
    })
    const youtubeVideoId = video.youtube_video.youtube_video_id
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`

    return {
      calName: video.channel.name,
      description: url,
      end: convertTimestampToArray(endedAt.epochMilliseconds, 'utc'),
      endInputType: 'utc',
      endOutputType: 'utc',
      location: 'YouTube',
      productId: siteName,
      start: convertTimestampToArray(publishedAt.epochMilliseconds, 'utc'),
      startInputType: 'utc',
      startOutputType: 'utc',
      title: video.title,
      uid: `${video.id}@shinju.date`,
      url,
    }
  })
}

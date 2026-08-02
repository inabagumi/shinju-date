import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Tables } from '@shinju-date/database'
import { getVideoExternalUrl } from '@shinju-date/helpers'
import { max, min } from '@shinju-date/temporal-fns'
import {
  convertTimestampToArray,
  createEvents,
  type EventAttributes,
} from 'ics'
import { Temporal } from 'temporal-polyfill'

type Talent = Pick<Tables<'talents'>, 'name'>

type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'platform' | 'published_at' | 'status' | 'title'
> & {
  talent: Talent
  youtube_video: Pick<Tables<'youtube_videos'>, 'youtube_video_id'> | null
  twitch_video: {
    twitch_video_id: string
    type: Tables<'twitch_videos'>['type']
    twitch_user: Pick<Tables<'twitch_users'>, 'twitch_login_name'> | null
  } | null
}

interface GetPublishedAtAndEndedAtOptions {
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

interface CreateEventAttributesListOptions {
  now: Temporal.ZonedDateTime
}

export function createEventAttributesList(
  videos: Video[],
  { now }: CreateEventAttributesListOptions,
): EventAttributes[] {
  const events: EventAttributes[] = []

  for (const video of videos) {
    const url = getVideoExternalUrl({
      platform: video.platform,
      status: video.status,
      twitchLoginName: video.twitch_video?.twitch_user?.twitch_login_name,
      twitchVideoId: video.twitch_video?.twitch_video_id,
      twitchVideoType: video.twitch_video?.type,
      youtubeVideoId: video.youtube_video?.youtube_video_id,
    })

    if (!url) {
      continue
    }

    const [publishedAt, endedAt] = getPublishedAtAndEndedAt(video, {
      now,
    })
    const location = video.platform === 'twitch' ? 'Twitch' : 'YouTube'

    events.push({
      calName: video.talent.name,
      description: url,
      end: convertTimestampToArray(endedAt.epochMilliseconds, 'utc'),
      endInputType: 'utc',
      endOutputType: 'utc',
      location,
      productId: siteName,
      start: convertTimestampToArray(publishedAt.epochMilliseconds, 'utc'),
      startInputType: 'utc',
      startOutputType: 'utc',
      title: video.title,
      uid: `${video.id}@shinju.date`,
      url,
    })
  }

  return events
}

import { Temporal } from '@js-temporal/polyfill'
import { type EventAttributes, createEvents } from 'ics'
import { type NextRequest, NextResponse } from 'next/server'
import { type Video, getVideosByChannelIDs } from '@/lib/algolia'
import { convertToDateArray, max, min } from '@/lib/date'

type GetPublishedAtAndEndedAtOptions = {
  now: Temporal.ZonedDateTime
}

type GetPublishedAtAndEndedAtResult = [
  publishedAt: Temporal.ZonedDateTime,
  endedAt: Temporal.ZonedDateTime
]

function getPublishedAtAndEndedAt(
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

type CreateEventAttributesListOptions = {
  now: Temporal.ZonedDateTime
}

function createEventAttributesList(
  videos: Video[],
  { now }: CreateEventAttributesListOptions
): EventAttributes[] {
  return videos.map((video): EventAttributes => {
    const [publishedAt, endedAt] = getPublishedAtAndEndedAt(video, { now })

    return {
      calName: video.channel.title,
      description: video.url,
      end: convertToDateArray(endedAt),
      endInputType: 'utc',
      endOutputType: 'utc',
      location: 'YouTube',
      productId: 'SHINJU DATE',
      start: convertToDateArray(publishedAt),
      startInputType: 'utc',
      startOutputType: 'utc',
      title: video.title,
      uid: `${video.id}@shinju.date`,
      url: video.url
    }
  })
}

type Params = {
  slug?: string
}

type Props = {
  params?: Params
}

export async function GET(
  _req: NextRequest,
  { params }: Props
): Promise<NextResponse> {
  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const channelIDs = params?.slug ? [params.slug] : []
  const videos = await getVideosByChannelIDs(channelIDs, {
    filters: [`publishedAt < ${now.add({ days: 7 }).epochSeconds}`],
    limit: 100
  })
  const events = createEventAttributesList(videos, { now })
  const { value } = createEvents(events)

  return new NextResponse(value ?? '', {
    headers: {
      'Cache-Control': 'max-age=60,s-maxage=300',
      'Content-Type': 'text/calendar;charset=UTF-8'
    }
  })
}

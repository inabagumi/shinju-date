import { Temporal } from '@js-temporal/polyfill'
import { createEvents } from 'ics'
import { getVideosByChannelIDs } from '../../../lib/algolia'
import type { DateArray, EventAttributes } from 'ics'
import type { NextApiHandler } from 'next'

function max(dateTimeList: Temporal.ZonedDateTime[]): Temporal.ZonedDateTime {
  return [...dateTimeList].sort((a, b) =>
    Temporal.ZonedDateTime.compare(b, a)
  )[0]
}

function min(dateTimeList: Temporal.ZonedDateTime[]): Temporal.ZonedDateTime {
  return [...dateTimeList].sort((a, b) =>
    Temporal.ZonedDateTime.compare(a, b)
  )[0]
}

function convertToDateArray(dateTime: Temporal.ZonedDateTime): DateArray {
  return [
    dateTime.year,
    dateTime.month,
    dateTime.day,
    dateTime.hour,
    dateTime.minute
  ]
}

const handler: NextApiHandler = async (req, res) => {
  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const channelIDs = (
    Array.isArray(req.query.channel) ? req.query.channel : [req.query.channel]
  ).filter(Boolean)
  const videos = await getVideosByChannelIDs(channelIDs, {
    filters: [`publishedAt < ${now.add({ days: 7 }).epochSeconds}`],
    limit: 100
  })
  const events = videos.map((video): EventAttributes => {
    const publishedAt = Temporal.Instant.fromEpochSeconds(
      video.publishedAt
    ).toZonedDateTimeISO(timeZone)
    const duration = Temporal.Duration.from(video.duration ?? 'P0D')
    const endedAt =
      duration.total({ unit: 'second' }) > 0
        ? publishedAt.add(duration)
        : min([
            max([publishedAt.add({ hours: 1 }), now.add({ minutes: 30 })]),
            publishedAt.add({ hours: 12 })
          ])

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

  const { value } = createEvents(events)

  res.setHeader('Cache-Control', 'max-age=60,s-maxage=300')
  res.setHeader('Content-Type', 'text/calendar;charset=UTF-8')
  res.status(200).send(value)
}

export default handler

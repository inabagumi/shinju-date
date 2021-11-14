import {
  add,
  addDays,
  addHours,
  addMinutes,
  fromUnixTime,
  getUnixTime,
  max,
  min
} from 'date-fns'
import { createEvents } from 'ics'
import { getVideosByQuery } from '../../../lib/algolia'
import { parseDuration } from '../../../lib/date-fns'
import type { DateArray, EventAttributes } from 'ics'
import type { NextApiHandler } from 'next'

function convertToDateArray(date: Date): DateArray {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes()
  ]
}

const handler: NextApiHandler = async (req, res) => {
  const now = new Date()
  const channels = (
    Array.isArray(req.query.channel) ? req.query.channel : [req.query.channel]
  ).filter(Boolean)
  const videos = await getVideosByQuery({
    filters: [
      ...channels.map((channelID) => `channel.id:${channelID}`),
      `publishedAt < ${getUnixTime(addDays(now, 7))}`
    ],
    limit: 100
  })
  const events = videos.map((video): EventAttributes => {
    const publishedAt = fromUnixTime(video.publishedAt)
    const endedAt = video.duration
      ? add(video.publishedAt, parseDuration(video.duration))
      : min([
          max([addHours(video.publishedAt, 1), addMinutes(now, 30)]),
          addHours(video.publishedAt, 12)
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

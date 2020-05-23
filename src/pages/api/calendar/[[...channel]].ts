import {
  add,
  addDays,
  addHours,
  addMinutes,
  getUnixTime,
  isPast
} from 'date-fns'
import { DateArray, EventAttributes, createEvents } from 'ics'
import { NextApiHandler } from 'next'

import { AlgoliaVideo } from '@/types'
import { getValue, normalize, search } from '@/utils'

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
  const channel = getValue(req.query.channel)
  const { hits } = await search<AlgoliaVideo>('', {
    filters: [
      channel && `channel.id:${channel}`,
      `publishedAt < ${getUnixTime(addDays(now, 7))}`
    ]
      .filter(Boolean)
      .join(' AND '),
    hitsPerPage: 100
  })
  const events = hits.map(normalize).map(
    (video): EventAttributes => {
      const endedAt = video.duration
        ? add(video.publishedAt, video.duration)
        : isPast(video.publishedAt)
        ? addMinutes(now, 30)
        : addHours(video.publishedAt, 1)

      return {
        description: video.url,
        end: convertToDateArray(endedAt),
        endInputType: 'utc',
        endOutputType: 'utc',
        location: 'YouTube',
        productId: 'SHINJU DATE',
        start: convertToDateArray(video.publishedAt),
        startInputType: 'utc',
        startOutputType: 'utc',
        title: video.title,
        uid: `${video.id}@shinju.date`,
        url: video.url
      }
    }
  )

  const { value } = createEvents(events)

  res.setHeader('Cache-Control', 'max-age=60,s-maxage=300')
  res.setHeader('Content-Type', 'text/calendar;charset=UTF-8')
  res.status(200).send(value)
}

export default handler

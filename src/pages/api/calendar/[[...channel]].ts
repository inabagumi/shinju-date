import {
  Duration,
  addDays,
  addHours,
  addMinutes,
  getUnixTime,
  isPast,
  parseJSON,
  addSeconds
} from 'date-fns'
import { EventAttributes, createEvents } from 'ics'
import { NextApiHandler } from 'next'

import { AlgoliaVideo } from '@/types'
import { getValue, normalize, parseDuration, search } from '@/utils'

const getSeconds = ({
  hours = 0,
  minutes = 0,
  seconds = 0
}: Duration): number => hours * 60 * 60 + minutes * 60 + seconds

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
      const publishedAt = parseJSON(video.publishedAt)
      const duration = parseDuration(video.duration)
      const seconds = getSeconds(duration)
      const endedAt =
        seconds > 0
          ? addSeconds(publishedAt, seconds)
          : isPast(publishedAt)
          ? addMinutes(now, 30)
          : addHours(publishedAt, 1)

      return {
        description: video.url,
        end: [
          endedAt.getUTCFullYear(),
          endedAt.getUTCMonth() + 1,
          endedAt.getUTCDate(),
          endedAt.getUTCHours(),
          endedAt.getUTCMinutes()
        ],
        endInputType: 'utc',
        endOutputType: 'utc',
        location: 'YouTube',
        productId: 'SHINJU DATE',
        start: [
          publishedAt.getUTCFullYear(),
          publishedAt.getUTCMonth() + 1,
          publishedAt.getUTCDate(),
          publishedAt.getUTCHours(),
          publishedAt.getUTCMinutes()
        ],
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

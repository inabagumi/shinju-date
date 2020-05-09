import {
  ObjectWithObjectID,
  SearchOptions,
  SearchResponse
} from '@algolia/client-search'
import algoliasearch from 'algoliasearch/lite'
import { Duration, fromUnixTime, getUnixTime, parseISO } from 'date-fns'
import { NextApiHandler } from 'next'

import Video from 'types/video'
import getValue from 'utils/getValue'

type VideoObject = Omit<Video, 'duration' | 'publishedAt'> & {
  duration?: string
  publishedAt: number
}

const search = async <T = unknown>(
  query: string,
  options: SearchOptions
): Promise<SearchResponse<T>> => {
  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID || '',
    process.env.ALGOLIA_API_KEY || ''
  )
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME || '')

  return index.search<T>(query, options)
}

const ISO8601_DURATION_REGEXP = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+))S$/

const parseDuration = (duration: string): Duration => {
  const match = duration.match(ISO8601_DURATION_REGEXP)

  return {
    hours: parseInt(match?.[1] || '0', 10),
    minutes: parseInt(match?.[2] || '0', 10),
    seconds: parseInt(match?.[3] || '0', 10)
  }
}

const normalize = ({
  channel,
  duration,
  id,
  publishedAt,
  title,
  url
}: VideoObject & ObjectWithObjectID): Video => ({
  channel,
  duration: parseDuration(duration || 'PT0S'),
  id,
  publishedAt: fromUnixTime(publishedAt).toJSON(),
  title,
  url
})

const handler: NextApiHandler<Array<Video>> = async (req, res) => {
  const query = getValue(req.query.q)
  const count = parseInt(getValue(req.query.count) || '20', 10)

  const filters = [
    req.query.until &&
      `publishedAt < ${getUnixTime(parseISO(getValue(req.query.until)))}`
  ]
    .filter(Boolean)
    .join(' AND ')

  const { hits } = await search<VideoObject>(query, {
    filters,
    hitsPerPage: count
  })

  res.setHeader('cache-control', 'max-age=60,s-maxage=120')
  res.status(200).json(hits.map(normalize))
}

export default handler

import { getUnixTime, parseISO } from 'date-fns'
import { NextApiHandler } from 'next'

import SearchResponseBody from 'types/search-response-body'
import getValue from 'utils/get-value'
import normalize, { VideoObject } from 'utils/normalize'
import search from 'utils/search'

const handler: NextApiHandler<SearchResponseBody> = async (req, res) => {
  const query = getValue(req.query.q)
  const count = parseInt(getValue(req.query.count) || '20', 10)

  const filters = [
    req.query.since &&
      `publishedAt > ${getUnixTime(parseISO(getValue(req.query.since)))}`,
    req.query.until &&
      `publishedAt < ${getUnixTime(parseISO(getValue(req.query.until)))}`
  ]
    .filter(Boolean)
    .join(' AND ')

  const { hits } = await search<VideoObject>(query, {
    filters,
    hitsPerPage: count
  })

  res.setHeader('cache-control', 'max-age=0,s-maxage=60')
  res.status(200).json(hits.map(normalize))
}

export default handler

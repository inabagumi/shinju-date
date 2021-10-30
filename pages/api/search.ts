import { getUnixTime, parseISO } from 'date-fns'
import { NextApiHandler } from 'next'
import getValue from '../../utils/getValue'
import normalize from '../../utils/normalize'
import search from '../../utils/search'
import type AlgoliaVideo from '../../types/AlgoliaVideo'
import type SearchResponseBody from '../../types/SearchResponseBody'

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

  const { hits } = await search<AlgoliaVideo>(query, {
    attributesToHighlight: [],
    filters,
    hitsPerPage: count
  })

  res.setHeader('cache-control', 'max-age=60')
  res.status(200).json(hits.map(normalize))
}

export default handler

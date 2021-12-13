import { type NextApiHandler } from 'next'
import { getQueryValue } from '../../lib/url'

const handler: NextApiHandler = (req, res) => {
  let basePath = '/videos'
  let query = getQueryValue('q', req.query)

  if (query) {
    const splitedQuery = query.split(' ')
    const channelIDs = splitedQuery
      .filter((value) => value.startsWith('from:'))
      .map((value) => value.slice(5))

    if (channelIDs.length === 1) {
      basePath = `/channels/${channelIDs[0]}/videos`
      query = splitedQuery
        .filter((value) => value !== `from:${channelIDs[0]}`)
        .join(' ')
    }
  }

  res.redirect(`${basePath}${query ? `/${encodeURIComponent(query)}` : ''}`)
}

export default handler

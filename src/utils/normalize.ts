import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import type { AlgoliaVideo, Video } from '@/types'

const normalize = ({
  channel,
  duration,
  id,
  publishedAt,
  title,
  url
}: AlgoliaVideo & ObjectWithObjectID): Video => ({
  channel,
  duration: duration || 'PT0S',
  id,
  publishedAt: fromUnixTime(publishedAt).toJSON(),
  title,
  url
})

export default normalize

import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import { isZeroSeconds, parseDuration } from '@/utils'
import type { AlgoliaVideo, Video } from '@/types'

function normalize({
  channel,
  duration: rawDuration,
  id,
  publishedAt,
  title,
  url
}: AlgoliaVideo & ObjectWithObjectID): Video {
  const duration = parseDuration(rawDuration ?? 'P0D')

  return {
    channel,
    duration: isZeroSeconds(duration) ? undefined : duration,
    id,
    publishedAt: fromUnixTime(publishedAt),
    title,
    url
  }
}

export default normalize

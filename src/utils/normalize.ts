import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import { isZeroSeconds, parseDuration } from '@/utils'
import type { AlgoliaVideo, Video } from '@/types'

const thumbnailBasePath = '/images/youtube'

function normalize({
  channel,
  duration: rawDuration,
  id,
  publishedAt,
  thumbnail,
  title,
  url
}: AlgoliaVideo & ObjectWithObjectID): Video {
  const duration = parseDuration(rawDuration ?? 'P0D')

  return {
    channel,
    duration: isZeroSeconds(duration) ? undefined : duration,
    id,
    publishedAt: fromUnixTime(publishedAt),
    thumbnail: {
      ...thumbnail,
      src: thumbnail.src.replace(
        /^https:\/\/i\.ytimg\.com\/vi\//,
        `${thumbnailBasePath}/`
      )
    },
    title,
    url
  }
}

export default normalize

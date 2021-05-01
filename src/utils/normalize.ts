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
  thumbnail: rawThumbnail,
  title,
  url
}: AlgoliaVideo & ObjectWithObjectID): Video {
  const duration = parseDuration(rawDuration ?? 'P0D')
  const thumbnail = rawThumbnail
    ? {
        ...rawThumbnail,
        src: rawThumbnail.src.replace(
          /^https:\/\/i\.ytimg\.com\/vi\//,
          `${thumbnailBasePath}/`
        )
      }
    : {
        height: 720,
        src: `${thumbnailBasePath}/${id}/maxresdefault.jpg`,
        width: 1280
      }

  return {
    channel,
    duration: isZeroSeconds(duration) ? undefined : duration,
    id,
    publishedAt: fromUnixTime(publishedAt),
    thumbnail,
    title,
    url
  }
}

export default normalize

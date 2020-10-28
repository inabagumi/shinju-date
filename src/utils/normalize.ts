import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import { isZeroSeconds, parseDuration } from '@/utils'
import type { AlgoliaVideo, Video } from '@/types'

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
  const thumbnail = rawThumbnail ?? {
    height: 720,
    src: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
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

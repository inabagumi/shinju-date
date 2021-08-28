import type { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'

import isZeroSeconds from '@/utils/isZeroSeconds'
import parseDuration from '@/utils/parseDuration'
import type AlgoliaVideo from '@/types/AlgoliaVideo'
import type Video from '@/types/Video'

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

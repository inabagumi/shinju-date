import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'
import ImgixClient from 'imgix-core-js'

import { isZeroSeconds, parseDuration } from '@/utils'
import type { AlgoliaVideo, Image, Video } from '@/types'

const ASPECT_RATIO = 0.5625

const imgixClient = new ImgixClient({
  domain: process.env.IMGIX_DOMAIN || 'example.imgix.net',
  includeLibraryParam: false,
  secureURLToken: process.env.IMGIX_SECURE_URL_TOKEN
})

function normalize({
  channel,
  duration: rawDuration,
  id,
  publishedAt,
  title,
  url
}: AlgoliaVideo & ObjectWithObjectID): Video {
  const duration = parseDuration(rawDuration ?? 'P0D')
  const thumbnails = [320, 480].map(
    (width): Image => ({
      height: width * ASPECT_RATIO,
      src: imgixClient.buildURL(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, {
        ar: `1:${ASPECT_RATIO}`,
        auto: 'compress,format',
        fit: 'crop',
        width
      }),
      width
    })
  )

  return {
    channel,
    duration: isZeroSeconds(duration) ? undefined : duration,
    id,
    publishedAt: fromUnixTime(publishedAt),
    thumbnails,
    title,
    url
  }
}

export default normalize

import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'
import ImgixClient from 'imgix-core-js'

import { isZeroSeconds, parseDuration } from '@/utils'
import type { AlgoliaVideo, Image, Video } from '@/types'

const ASPECT_RATIO = 0.5625

const createImgixClient = (): ImgixClient =>
  new ImgixClient({
    domain: process.env.IMGIX_DOMAIN || 'example.imgix.net',
    includeLibraryParam: false,
    secureURLToken: process.env.IMGIX_SECURE_URL_TOKEN
  })

let imgixClient: ImgixClient

const buildThumbnail = (id: string, width = 320): Image => {
  imgixClient = imgixClient ?? createImgixClient()

  const path = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
  const params = {
    ar: `1:${ASPECT_RATIO}`,
    auto: 'compress,format',
    fit: 'crop',
    w: width
  }

  return {
    height: width * ASPECT_RATIO,
    preSrc: imgixClient.buildURL(path, {
      ...params,
      w: 10
    }),
    src: imgixClient.buildURL(path, params),
    srcSet: imgixClient
      .buildSrcSet(path, params)
      .split(/\s*,\s*/)
      .slice(0, 3)
      .join(', '),
    width
  }
}

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
    thumbnail: buildThumbnail(id),
    title,
    url
  }
}

export default normalize

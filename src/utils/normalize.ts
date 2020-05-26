import { ObjectWithObjectID } from '@algolia/client-search'
import { fromUnixTime } from 'date-fns'
import ImgixClient from 'imgix-core-js'

import { isZeroSeconds, parseDuration } from '@/utils'
import type { AlgoliaImage, AlgoliaVideo, Image, Video } from '@/types'

const ASPECT_RATIO = 0.5625

const createImgixClient = (): ImgixClient =>
  new ImgixClient({
    domain: process.env.IMGIX_DOMAIN || 'example.imgix.net',
    includeLibraryParam: false,
    secureURLToken: process.env.IMGIX_SECURE_URL_TOKEN
  })

let imgixClient: ImgixClient

const normalizeThumbnail = (thumbnail: AlgoliaImage, width = 320): Image => {
  imgixClient = imgixClient ?? createImgixClient()

  const params = {
    ar: `1:${ASPECT_RATIO}`,
    auto: 'compress,format',
    fit: 'crop',
    w: width
  }
  const preSrc =
    thumbnail.preSrc ??
    imgixClient.buildURL(thumbnail.src, {
      ...params,
      w: 10
    })

  return {
    height: width * ASPECT_RATIO,
    preSrc,
    src: imgixClient.buildURL(thumbnail.src, params),
    srcSet: imgixClient
      .buildSrcSet(thumbnail.src, params)
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
    thumbnail: normalizeThumbnail(thumbnail),
    title,
    url
  }
}

export default normalize

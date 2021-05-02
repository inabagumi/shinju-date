import dedent from 'dedent'
import Image from 'next/image'
import type { VFC } from 'react'

import { Video } from '@/types'

function getBlurDataURL(src: string, width: number, height: number): string {
  const svg = dedent`
    <svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="blur" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20" edgeMode="duplicate"/>
        <feComponentTransfer>
          <feFuncA type="discrete" tableValues="1 1"/>
        </feComponentTransfer>
      </filter>
      <image filter="url(#blur)" href="${src}" x="0" y="0" height="100%" width="100%"/>
    </svg>
  `

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

type Props = {
  value: Video
}

const Thumbnail: VFC<Props> = ({ value }) => {
  const width = value.thumbnail.width ?? 1920
  const height = width * 0.5625

  return (
    <Image
      alt={value.title}
      blurDataURL={getBlurDataURL(value.thumbnail.preSrc, width, height)}
      height={height}
      layout="responsive"
      objectFit="cover"
      objectPosition="center"
      placeholder="blur"
      /* todo: https://github.com/vercel/next.js/pull/24704 */
      priority
      sizes="(max-width: 996px) 100vw, 30vw"
      src={value.thumbnail.src}
      width={width}
    />
  )
}

export default Thumbnail

import Image from 'next/image'
import type { VFC } from 'react'

import { Video } from '@/types'

type Props = {
  value: Video
}

const Thumbnail: VFC<Props> = ({ value }) => {
  const width = value.thumbnail.width ?? 1920
  const height = width * 0.5625

  return (
    <Image
      alt={value.title}
      blurDataURL={value.thumbnail.preSrc}
      height={height}
      layout="responsive"
      objectFit="cover"
      objectPosition="center"
      placeholder="blur"
      sizes="(max-width: 996px) 100vw, 30vw"
      src={value.thumbnail.src}
      width={width}
    />
  )
}

export default Thumbnail

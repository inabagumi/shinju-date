import Image from 'next/image'
import Skeleton from './skeleton'
import styles from './thumbnail.module.css'
import type { Image as ImageObject } from '../lib/algolia'
import type { VFC } from 'react'

const thumbnailBasePath = '/images/youtube'
const defaultPreSrc =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII='

type Props = {
  alt?: string
  value?: ImageObject
}

const Thumbnail: VFC<Props> = ({ alt = '', value }) => {
  const width = value?.width ?? 1920
  const height = width * 0.5625
  const src = value?.src.replace(
    /^https:\/\/i\.ytimg\.com\/vi\/([^/]+)\/([^.]+)\.jpg$/,
    (_, id: string, filename: string) =>
      `${thumbnailBasePath}/${id}${
        filename === 'maxresdefault' ? '' : `/${filename}`
      }.jpg`
  )
  const preSrc = value?.preSrc ?? defaultPreSrc

  return src ? (
    <Image
      alt={alt}
      blurDataURL={preSrc}
      height={height}
      layout="responsive"
      objectFit="cover"
      objectPosition="center"
      placeholder="blur"
      sizes="(max-width: 996px) 100vw, 30vw"
      src={src}
      width={width}
    />
  ) : (
    <Skeleton className={styles.skeleton} variant="rect" />
  )
}

export default Thumbnail

import Image from 'next/image'
import { type FC } from 'react'
import { type Image as ImageObject } from '../lib/algolia'
import Skeleton from './skeleton'
import styles from './thumbnail.module.css'

const defaultPreSrc =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII='

type Props = {
  alt?: string
  value?: ImageObject
}

const Thumbnail: FC<Props> = ({ alt = '', value }) => {
  const width = value?.width ?? 1920
  const height = width * 0.5625
  const preSrc = value?.preSrc ?? defaultPreSrc

  return value?.src ? (
    <Image
      alt={alt}
      blurDataURL={preSrc}
      height={height}
      layout="responsive"
      objectFit="cover"
      objectPosition="center"
      placeholder="blur"
      sizes="(max-width: 996px) 100vw, 30vw"
      src={value.src}
      width={width}
    />
  ) : (
    <Skeleton className={styles.skeleton} variant="rect" />
  )
}

export default Thumbnail

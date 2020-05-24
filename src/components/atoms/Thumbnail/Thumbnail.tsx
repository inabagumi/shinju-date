import React, { FC, memo } from 'react'

import Skeleton from '@/components/atoms/Skeleton'
import type { Image } from '@/types'

import styles from './Thumbnail.module.css'

const buildSizes = (images: Image[]): string =>
  images
    .map(({ width }, i) =>
      [i === 0 && '(min-width: 500px)', `${width}px`].filter(Boolean).join(' ')
    )
    .join(', ')

const buildSrcSet = (images: Image[]): string =>
  images
    .map(({ src, width }, i): string =>
      [src, i < images.length - 1 && `${width}w`].filter(Boolean).join(' ')
    )
    .join(', ')

type Props = {
  values?: Image[]
}

const Thumbnail: FC<Props> = ({ values }) => {
  return (
    <div className={styles.thumbnail}>
      {values ? (
        <img
          alt=""
          className={styles.image}
          height={values[0].height}
          loading="lazy"
          sizes={buildSizes(values)}
          src={values[0].src}
          srcSet={buildSrcSet(values)}
          width={values[0].width}
        />
      ) : (
        <Skeleton className={styles.image} variant="rect" />
      )}
    </div>
  )
}

export default memo(
  Thumbnail,
  ({ values: previousValues }, { values: nextValues }) => {
    const srcs = (nextValues ?? []).map((value) => value.src)

    return (previousValues ?? []).every((value) => srcs.includes(value.src))
  }
)

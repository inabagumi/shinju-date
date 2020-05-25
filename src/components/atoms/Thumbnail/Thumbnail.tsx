import React, { FC, memo } from 'react'

import Skeleton from '@/components/atoms/Skeleton'
import { Video } from '@/types'

import styles from './Thumbnail.module.css'

type Props = {
  value?: Video
}

const Thumbnail: FC<Props> = ({ value }) => (
  <div className={styles.thumbnail}>
    {value ? (
      <img
        alt=""
        className={styles.image}
        height={value.thumbnail.height}
        loading="lazy"
        src={value.thumbnail.src}
        srcSet={value.thumbnail.srcSet}
        style={{ backgroundImage: `url('${value.thumbnail.preSrc}')` }}
        width={value.thumbnail.width}
      />
    ) : (
      <Skeleton className={styles.image} variant="rect" />
    )}
  </div>
)

export default memo(
  Thumbnail,
  ({ value: previousValue }, { value: nextValue }) =>
    previousValue?.thumbnail.srcSet !== nextValue?.thumbnail.srcSet
)

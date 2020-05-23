import React, { FC, memo } from 'react'

import Skeleton from '@/components/atoms/Skeleton'

import styles from './Thumbnail.module.css'

type Props = {
  id?: string
}

const Thumbnail: FC<Props> = ({ id }) => (
  <div className={styles.thumbnail}>
    {id ? (
      <img
        alt=""
        className={styles.image}
        height={360}
        loading="lazy"
        sizes="(min-width: 500px) 320px, 480px"
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        srcSet={[
          `https://i.ytimg.com/vi/${id}/mqdefault.jpg 320w`,
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        ].join(', ')}
        width={480}
      />
    ) : (
      <Skeleton className={styles.image} variant="rect" />
    )}
  </div>
)

export default memo(
  Thumbnail,
  (previousProps, nextProps) => previousProps.id === nextProps.id
)

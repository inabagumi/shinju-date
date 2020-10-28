import Image from 'next/image'
import { memo } from 'react'
import type { FC } from 'react'

import Skeleton from '@/components/Skeleton'
import { Video } from '@/types'

import styles from './Thumbnail.module.css'

type Props = {
  value?: Video
}

const Thumbnail: FC<Props> = ({ value }) => (
  <div className={styles.thumbnail}>
    {value ? (
      <>
        {value.thumbnail.preSrc && (
          <div
            className={styles.placeholder}
            style={{
              backgroundImage: `url(${value.thumbnail.preSrc})`
            }}
          />
        )}
        <Image
          alt=""
          height={value.thumbnail.height}
          sizes="(max-width: 996px) 100vw, 30vw"
          src={value.thumbnail.src}
          width={value.thumbnail.width}
        />
      </>
    ) : (
      <Skeleton className={styles.skeleton} variant="rect" />
    )}
  </div>
)

export default memo(
  Thumbnail,
  ({ value: previousValue }, { value: nextValue }) =>
    previousValue?.thumbnail.src !== nextValue?.thumbnail.src
)

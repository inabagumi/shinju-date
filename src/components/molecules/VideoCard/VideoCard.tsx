import clsx from 'clsx'
import { isBefore, parseJSON } from 'date-fns'
import React, {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  useEffect,
  useState
} from 'react'
import { useInView } from 'react-intersection-observer'

import Skeleton from '@/components/atoms/Skeleton'
import Time from '@/components/atoms/Time'
import Thumbnail from '@/components/atoms/Thumbnail'
import type { Video } from '@/types'
import { isZeroSeconds, parseDuration } from '@/utils'

import styles from './VideoCard.module.css'

type TimeOptions = {
  relativeTime?: boolean
}

type Props = DetailedHTMLProps<
  HTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> & {
  timeOptions?: TimeOptions
  value?: Video
}

const VideoCard: FC<Props> = ({ timeOptions, value, ...props }) => {
  const [now, setNow] = useState(() => new Date())
  const [imageRef, inView] = useInView()

  useEffect(() => {
    if (!value || !inView) return

    const timerID = setInterval(() => {
      setNow(new Date())
    })

    return (): void => {
      clearInterval(timerID)
    }
  }, [value, inView])

  return (
    <a
      className={clsx('card', styles.video)}
      href={value?.url}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      <div className={clsx('card__image', styles.image)} ref={imageRef}>
        {value ? (
          <Thumbnail id={value.id} />
        ) : (
          <Skeleton className={styles.thumbnailSkeleton} variant="rect" />
        )}

        {value?.duration && !isZeroSeconds(parseDuration(value?.duration)) ? (
          <Time
            className={clsx('badge', 'badge--info', styles.duration)}
            dateTime={value.duration}
            variant="duration"
          />
        ) : value?.publishedAt &&
          isBefore(parseJSON(value.publishedAt), now) ? (
          <span className={clsx('badge', 'badge--info', styles.liveNow)}>
            ライブ配信中
          </span>
        ) : null}
      </div>

      <div className={clsx('card__body', styles.content)}>
        <h4>
          {value?.title ?? (
            <>
              <Skeleton className={styles.titleSkeleton} variant="text" />
              <Skeleton className={styles.titleSkeleton} variant="text" />
            </>
          )}
        </h4>
      </div>

      <div className="card__footer">
        {value?.publishedAt ? (
          <Time
            className={styles.published}
            dateTime={value.publishedAt}
            variant={timeOptions?.relativeTime ? 'relative' : 'normal'}
          />
        ) : (
          <span className={styles.published}>
            <Skeleton variant="text" />
          </span>
        )}
      </div>
    </a>
  )
}

export default VideoCard

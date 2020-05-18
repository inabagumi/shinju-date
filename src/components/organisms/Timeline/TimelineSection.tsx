import { format, parseJSON } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, { FC } from 'react'

import Skeleton from '@/components/atoms/Skeleton'
import SearchSkeleton from '@/components/molecules/SearchSkeleton'
import VideoCard from '@/components/molecules/VideoCard'
import type { Video } from '@/types'

type Props = {
  dateTime?: string
  items?: Array<Video>
}

const TimelineSection: FC<Props> = ({ dateTime, items }) => (
  <section className="margin-top--lg section">
    <h2 className="margin-bottom--lg text--right">
      {dateTime ? (
        <time dateTime={dateTime}>
          {format(parseJSON(dateTime), 'P', { locale: jaLocale })}
        </time>
      ) : (
        <Skeleton variant="text" />
      )}
    </h2>

    {items ? (
      <div className="row">
        {items.map((item) => (
          <div
            className="col col--4 padding-bottom--lg padding-horiz--sm"
            key={item.id}
          >
            <VideoCard value={item} />
          </div>
        ))}
      </div>
    ) : (
      <SearchSkeleton />
    )}
  </section>
)

export default TimelineSection

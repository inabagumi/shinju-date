import { format, parseJSON } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import chunk from 'lodash.chunk'
import { FC } from 'react'

import Skeleton from '@/components/Skeleton'
import VideoCard from '@/components/VideoCard'
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

    <div className="container">
      {items ? (
        chunk(items, 3).map((values) => (
          <div className="row" key={values.map((value) => value.id).join(':')}>
            {values.map((value) => (
              <div
                className="col col--4 padding-bottom--lg padding-horiz--sm"
                key={value.id}
              >
                <VideoCard value={value} />
              </div>
            ))}
          </div>
        ))
      ) : (
        <div className="row" key={0}>
          <div className="col col--4 padding-bottom--lg padding-horiz--sm">
            <VideoCard />
          </div>
          <div className="col col--4 padding-bottom--lg padding-horiz--sm">
            <VideoCard />
          </div>
        </div>
      )}
    </div>
  </section>
)

export default TimelineSection

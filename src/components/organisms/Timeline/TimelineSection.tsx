import { format, parseJSON } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, { FC } from 'react'

import Skeleton from '@/components/atoms/Skeleton'
import Grid, { Col, Row } from '@/components/molecules/Grid'
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

    <Grid>
      {items ? (
        <Row>
          {items.map((item) => (
            <Col
              className="padding-bottom--lg padding-horiz--sm"
              key={item.id}
              size={4}
            >
              <VideoCard value={item} />
            </Col>
          ))}
        </Row>
      ) : (
        <SearchSkeleton />
      )}
    </Grid>
  </section>
)

export default TimelineSection

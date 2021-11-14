import { fromUnixTime, startOfDay } from 'date-fns'
import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { useMemo } from 'react'
import { FormattedDate } from 'react-intl'
import VideoCard from './video-card'
import type { VFC } from 'react'
import type { Video } from '../lib/algolia'

const buildScheduleMap = (values: Video[]): Record<string, Video[]> => {
  return groupBy(values, (value) =>
    startOfDay(fromUnixTime(value.publishedAt)).toJSON()
  )
}

type Props = {
  values: Video[]
}

const Timeline: VFC<Props> = ({ values }) => {
  const schedule = useMemo(() => buildScheduleMap(values), [values])

  return (
    <>
      {Object.entries(schedule).map(([dateTime, items]) => (
        <section className="margin-top--lg section" key={dateTime}>
          <h2 className="margin-bottom--lg text--right">
            <time dateTime={dateTime}>
              <FormattedDate
                day="2-digit"
                month="2-digit"
                value={dateTime}
                year="numeric"
              />
            </time>
          </h2>

          <div className="container">
            {chunk(items, 3).map((values) => (
              <div
                className="row"
                key={`items:[${values.map((value) => value.id).join(',')}]`}
              >
                {values.map((value) => (
                  <div
                    className="col col--4 padding-bottom--lg padding-horiz--sm"
                    key={value.id}
                  >
                    <VideoCard value={value} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

export default Timeline

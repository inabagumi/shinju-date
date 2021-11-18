import { Temporal } from '@js-temporal/polyfill'
import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { useMemo } from 'react'
import { FormattedDate, useIntl } from 'react-intl'
import VideoCard from './video-card'
import type { Video } from '../lib/algolia'
import type { VFC } from 'react'

type BuildScheduleMapOptions = {
  timeZone?: string
}

const buildScheduleMap = (
  values: Video[],
  { timeZone = 'UTC' }: BuildScheduleMapOptions = {}
): Record<string, Video[]> => {
  const tz = Temporal.TimeZone.from(timeZone)

  return groupBy(values, (value) => {
    const publishedAt = Temporal.Instant.fromEpochSeconds(
      value.publishedAt
    ).toZonedDateTimeISO(tz)
    const publishedDate = publishedAt.toPlainDate()

    return publishedDate.toString()
  })
}

type Props = {
  values: Video[]
}

const Timeline: VFC<Props> = ({ values }) => {
  const intl = useIntl()
  const schedule = useMemo(
    () => buildScheduleMap(values, { timeZone: intl.timeZone }),
    [values, intl.timeZone]
  )

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

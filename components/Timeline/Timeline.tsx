import { compareAsc, format, parseJSON, startOfDay } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import chunk from 'lodash.chunk'
import groupBy from 'lodash.groupby'
import { memo, useMemo } from 'react'
import type { FC } from 'react'

import Skeleton from '@/components/Skeleton'
import VideoCard from '@/components/VideoCard'
import type Video from '@/types/Video'

const compare = (leftVideo: Video, rightVideo: Video): number =>
  compareAsc(leftVideo.publishedAt, rightVideo.publishedAt)

const buildScheduleMap = (values: Video[]): Record<string, Video[]> => {
  const reverseValues = [...values].sort(compare)

  return groupBy(reverseValues, (value) =>
    startOfDay(value.publishedAt).toJSON()
  )
}

type Props = {
  values?: Video[]
}

const Timeline: FC<Props> = ({ values }) => {
  const schedule = useMemo(() => values && buildScheduleMap(values), [values])

  return (
    <>
      {schedule ? (
        Object.entries(schedule).map(([dateTime, items]) => (
          <section className="margin-top--lg section" key={dateTime}>
            <h2 className="margin-bottom--lg text--right">
              <time dateTime={dateTime}>
                {format(parseJSON(dateTime), 'P', { locale: jaLocale })}
              </time>
            </h2>

            <div className="container">
              {chunk(items, 3).map((values) => (
                <div
                  className="row"
                  key={values.map((value) => value.id).join(':')}
                >
                  {values.map((value) => (
                    <div
                      className="col col--4 padding-bottom--lg padding-horiz--sm"
                      key={value.id}
                    >
                      <VideoCard value={value} />
                    </div>
                  ))}
                  {new Array(3 - values.length).fill(
                    <div className="col col--4" />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="margin-top--lg section">
          <h2 className="margin-bottom--lg text--right">
            <Skeleton variant="text" />
          </h2>
          <div className="container">
            <div className="row">
              <div className="col col--4 padding-bottom--lg padding-horiz--sm">
                <VideoCard />
              </div>
              <div className="col col--4 padding-bottom--lg padding-horiz--sm">
                <VideoCard />
              </div>
              <div className="col col--4" />
            </div>
          </div>
        </section>
      )}
    </>
  )
}

export default memo(Timeline)

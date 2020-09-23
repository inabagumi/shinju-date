import { compareAsc, startOfDay } from 'date-fns'
import groupBy from 'lodash.groupby'
import { FC, memo, useMemo } from 'react'
import type { Video } from '@/types'
import TimelineSection from './TimelineSection'

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
        Object.entries(schedule).map(([day, items]) => (
          <TimelineSection dateTime={day} items={items} key={day} />
        ))
      ) : (
        <TimelineSection />
      )}
    </>
  )
}

export default memo(Timeline)

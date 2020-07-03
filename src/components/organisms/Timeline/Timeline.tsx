import { compareAsc, startOfDay } from 'date-fns'
import React, { FC, memo, useMemo } from 'react'
import type { Video } from '@/types'
import { groupBy } from '@/utils'
import TimelineSection from './TimelineSection'

const compare = (
  { publishedAt: leftPublishedAt }: Video,
  { publishedAt: rightPublishedAt }: Video
): number => compareAsc(leftPublishedAt, rightPublishedAt)

const buildScheduleMap = (values: Array<Video>): Record<string, Video[]> => {
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

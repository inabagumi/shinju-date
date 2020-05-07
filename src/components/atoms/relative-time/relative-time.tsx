import { format, formatDistanceToNow } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, { FC, useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

const relativeTime = (date: Date): string =>
  formatDistanceToNow(date, {
    addSuffix: true,
    includeSeconds: true,
    locale: jaLocale
  })

type Props = {
  date: Date
}

const Time: FC<Props> = ({ date }) => {
  const [label, setLabel] = useState(() => relativeTime(date))
  const [timeRef, inView] = useInView()

  useEffect(() => {
    if (!inView) return

    const timerID = setInterval(() => {
      setLabel(relativeTime(date))
    }, 5000)

    return (): void => {
      clearInterval(timerID)
    }
  }, [date, inView])

  return (
    <time
      dateTime={date.toISOString()}
      ref={timeRef}
      title={format(date, 'yyyy/MM/dd HH:mm:ss')}
    >
      {label}
    </time>
  )
}

export default Time

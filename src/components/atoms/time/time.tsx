import { format, formatDistanceToNow } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, { FC, useEffect, useState } from 'react'

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

  useEffect(() => {
    const timerID = setInterval(() => {
      setLabel(relativeTime(date))
    }, 5000)

    return (): void => {
      clearInterval(timerID)
    }
  }, [date])

  return (
    <time
      dateTime={date.toISOString()}
      title={format(date, 'yyyy/MM/dd HH:mm:ss')}
    >
      {label}
    </time>
  )
}

export default Time

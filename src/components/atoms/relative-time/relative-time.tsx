import { formatDistanceToNow, parseISO } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, {
  FC,
  DetailedHTMLProps,
  TimeHTMLAttributes,
  useEffect,
  useState
} from 'react'
import { useInView } from 'react-intersection-observer'

const relativeTime = (date: Date): string =>
  formatDistanceToNow(date, {
    addSuffix: true,
    includeSeconds: true,
    locale: jaLocale
  })

type Props = DetailedHTMLProps<
  TimeHTMLAttributes<HTMLTimeElement>,
  HTMLTimeElement
>

const RelativeTime: FC<Props> = ({
  dateTime = new Date().toISOString(),
  ...props
}) => {
  const [date, setDate] = useState(() => parseISO(dateTime))
  const [label, setLabel] = useState(() => relativeTime(date))
  const [timeRef, inView] = useInView()

  useEffect(() => {
    setDate(parseISO(dateTime))
  }, [dateTime])

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
    <time dateTime={dateTime} ref={timeRef} {...props}>
      {label}
    </time>
  )
}

export default RelativeTime

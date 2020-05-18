import { format, parseISO } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'
import React, {
  FC,
  DetailedHTMLProps,
  TimeHTMLAttributes,
  useEffect,
  useState
} from 'react'

type Props = DetailedHTMLProps<
  TimeHTMLAttributes<HTMLTimeElement>,
  HTMLTimeElement
>

const SimpleTime: FC<Props> = ({
  dateTime = new Date().toISOString(),
  title,
  ...props
}) => {
  const [date, setDate] = useState(() => parseISO(dateTime))

  useEffect(() => {
    setDate(parseISO(dateTime))
  }, [dateTime])

  return (
    <time
      dateTime={dateTime}
      title={title ?? format(date, 'PPPp', { locale: jaLocale })}
      {...props}
    >
      {format(date, 'p', { locale: jaLocale })}
    </time>
  )
}

export default SimpleTime

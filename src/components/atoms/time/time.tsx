import React, { FC, ReactElement } from 'react'
import { FormattedRelativeTime, useIntl } from 'react-intl'

const FORMAT_DATE_OPTIONS = {
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  month: 'numeric',
  year: 'numeric'
}

type Props = {
  date: Date
}

const Time: FC<Props> = ({ date }): ReactElement => {
  const intl = useIntl()

  return (
    <time
      dateTime={date.toISOString()}
      title={intl.formatDate(date, FORMAT_DATE_OPTIONS)}
    >
      <FormattedRelativeTime
        numeric="auto"
        style="narrow"
        unit="second"
        updateIntervalInSeconds={1}
        value={Math.floor((date.getTime() - Date.now()) / 1000)}
      />
    </time>
  )
}

export default Time

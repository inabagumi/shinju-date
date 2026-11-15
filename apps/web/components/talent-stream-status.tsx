import { TIME_ZONE } from '@shinju-date/constants'
import { formatDate, formatTime } from '@shinju-date/temporal-fns'
import { twMerge } from '@shinju-date/ui'

/** A 2px ring in the live color, 2px apart from the icon */
export const LIVE_RING_CLASS_NAME =
  'ring-2 ring-live ring-offset-2 ring-offset-background'

interface NextStreamProps {
  className?: string | undefined
  id?: string | undefined
  startsAt: string
}

/**
 * The start of the next stream as `次回 11/16 20:00`. It is built without
 * `toLocaleString`, whose output differs between the native Temporal and
 * temporal-polyfill and causes hydration errors.
 */
export function NextStream({ className, id, startsAt }: NextStreamProps) {
  const dateTime = Temporal.Instant.from(startsAt).toZonedDateTimeISO(TIME_ZONE)

  return (
    <span
      className={twMerge('text-caption text-muted tabular-nums', className)}
      id={id}
    >
      次回{' '}
      <time dateTime={dateTime.toString({ timeZoneName: 'never' })}>
        {formatDate(dateTime, { includeYear: false })} {formatTime(dateTime)}
      </time>
    </span>
  )
}

import { logger } from '@shinju-date/logger'
import { twMerge } from '@shinju-date/ui'
import { WEEKDAYS } from '@/lib/date-heading'
import { fetchTalentStreamStarts } from '@/lib/fetchers'
import {
  countStreamsByWeekdayAndHour,
  getStreamCountLevel,
  STREAM_TENDENCY_DAYS,
  STREAM_TENDENCY_MIN_STREAMS,
  summarizeStreamTendency,
} from '@/lib/stream-tendency'
import { getShownTalent, type TalentPageParams } from '../_lib/get-shown-talent'

/**
 * The background of a cell for each level of `getStreamCountLevel`. It is
 * always the accent, not the theme color of the talent, so the levels can be
 * told apart in both the light and the dark themes.
 */
const LEVEL_CLASS_NAMES = [
  'bg-muted',
  'bg-accent/25',
  'bg-accent/50',
  'bg-accent/75',
  'bg-accent',
] as const

/**
 * The hours whose numbers are shown above the columns. The headings are read
 * out from the hidden text for every hour, as the browsers put a space between
 * a shown number and a hidden suffix.
 */
const LABELED_HOURS = new Set([0, 6, 12, 18])

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

interface StreamTendencyProps {
  /** The counts of `countStreamsByWeekdayAndHour` */
  counts: number[][]
}

/**
 * The tendency of a talent's streams: how many of them started on each day of
 * the week and in each hour, as a table of cells shaded by the count. The
 * numbers are only read out, not shown in the cells.
 *
 * Nothing is rendered with fewer streams than `STREAM_TENDENCY_MIN_STREAMS`,
 * so no space is left for it.
 */
export function StreamTendency({ counts }: StreamTendencyProps) {
  const { busiestHour, busiestWeekday, max, total } =
    summarizeStreamTendency(counts)

  if (
    total < STREAM_TENDENCY_MIN_STREAMS ||
    busiestHour === null ||
    busiestWeekday === null
  ) {
    return null
  }

  return (
    <section aria-labelledby="stream-tendency-heading" className="mb-8">
      <h2 className="text-heading font-bold" id="stream-tendency-heading">
        配信の傾向
      </h2>
      <p className="mt-1 text-meta text-muted">
        直近{STREAM_TENDENCY_DAYS}日の配信は
        <span className="tabular-nums">{total}</span>
        回。いちばん多いのは{WEEKDAYS[busiestWeekday]}曜日、時間帯は
        <span className="tabular-nums">{busiestHour}</span>時台です。
      </p>
      <table className="mt-4 w-full table-fixed border-separate border-spacing-0.5">
        <caption className="sr-only">曜日と時間帯ごとの配信回数</caption>
        <thead>
          <tr>
            <td className="w-6 p-0" />
            {HOURS.map((hour) => (
              <th
                className="overflow-visible p-0 text-left align-bottom text-caption font-normal whitespace-nowrap text-muted tabular-nums"
                key={hour}
                scope="col"
              >
                {LABELED_HOURS.has(hour) && (
                  <span aria-hidden="true">{hour}</span>
                )}
                <span className="sr-only">{hour}時</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((weekday, weekdayIndex) => (
            <tr key={weekday}>
              <th
                className="p-0 pr-1 text-left text-caption font-normal text-muted"
                scope="row"
              >
                <span aria-hidden="true">{weekday}</span>
                <span className="sr-only">{weekday}曜日</span>
              </th>
              {HOURS.map((hour) => {
                const count = counts[weekdayIndex]?.[hour] ?? 0

                return (
                  <td className="p-0" key={hour}>
                    <span
                      className={twMerge(
                        'block aspect-square',
                        LEVEL_CLASS_NAMES[getStreamCountLevel(count, max)],
                      )}
                      data-testid="stream-tendency-cell"
                    >
                      <span className="sr-only">{count}回</span>
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

interface TalentStreamTendencyProps {
  params: TalentPageParams
}

/**
 * The tendency of the streams of the talent of the page. It is not a part of
 * the page that must be shown, so nothing is rendered when the streams cannot
 * be fetched.
 */
export async function TalentStreamTendency({
  params,
}: TalentStreamTendencyProps) {
  const talent = await getShownTalent(params)
  let starts: string[]

  try {
    starts = await fetchTalentStreamStarts(talent.id)
  } catch (error) {
    logger.error('Failed to fetch the streams of the talent', {
      error,
      talentId: talent.id,
    })

    return null
  }

  return <StreamTendency counts={countStreamsByWeekdayAndHour(starts)} />
}

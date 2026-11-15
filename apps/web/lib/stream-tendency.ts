import { TIME_ZONE } from '@shinju-date/constants'

/** 配信の傾向で数える期間の日数（今日の 0:00 からさかのぼる） */
export const STREAM_TENDENCY_DAYS = 90

/** 配信の傾向を表示するのに必要な配信の回数。これより少ないと表示しない */
export const STREAM_TENDENCY_MIN_STREAMS = 10

const WEEKDAY_COUNT = 7
const HOUR_COUNT = 24

/** 濃淡の段階の数（0回を除く） */
export const STREAM_COUNT_LEVELS = 4

export interface StreamTendencySummary {
  /** いちばん多い時間（0〜23）。配信がないときは `null` */
  busiestHour: number | null
  /** いちばん多い曜日（`0` が月曜、`6` が日曜）。配信がないときは `null` */
  busiestWeekday: number | null
  /** いちばん多いセルの回数 */
  max: number
  /** 配信の回数の合計 */
  total: number
}

/**
 * 配信の開始日時（ISO 8601）を、`TIME_ZONE` での曜日と時間ごとに数える。
 * 戻り値は 7×24 で、`[0]` が月曜、`[0][21]` が月曜の21時台の回数。
 *
 * 1日の区切りは 0:00 で、深夜 1:00 に始まった配信はその日付の1時台に数える。
 */
export function countStreamsByWeekdayAndHour(starts: string[]): number[][] {
  const counts = Array.from({ length: WEEKDAY_COUNT }, () =>
    Array.from({ length: HOUR_COUNT }, () => 0),
  )

  for (const start of starts) {
    const dateTime = Temporal.Instant.from(start).toZonedDateTimeISO(TIME_ZONE)
    const row = counts[dateTime.dayOfWeek - 1]

    if (row) {
      row[dateTime.hour] = (row[dateTime.hour] ?? 0) + 1
    }
  }

  return counts
}

/**
 * いちばん大きい値の位置。同じ値のときは前のもの（月曜に近い曜日、早い時間）
 * を選ぶ。すべて 0 のときは `null`。
 */
function indexOfMax(values: number[]): number | null {
  let index: number | null = null
  let max = 0

  for (const [i, value] of values.entries()) {
    if (value > max) {
      index = i
      max = value
    }
  }

  return index
}

/**
 * `countStreamsByWeekdayAndHour` の回数から、合計、いちばん多い曜日（行の
 * 合計）、いちばん多い時間（列の合計）、いちばん多いセルの回数を求める。
 */
export function summarizeStreamTendency(
  counts: number[][],
): StreamTendencySummary {
  const weekdayTotals = counts.map((row) =>
    row.reduce((sum, count) => sum + count, 0),
  )
  const hourTotals = Array.from({ length: HOUR_COUNT }, (_, hour) =>
    counts.reduce((sum, row) => sum + (row[hour] ?? 0), 0),
  )

  return {
    busiestHour: indexOfMax(hourTotals),
    busiestWeekday: indexOfMax(weekdayTotals),
    max: Math.max(0, ...counts.flat()),
    total: weekdayTotals.reduce((sum, count) => sum + count, 0),
  }
}

/**
 * セルの濃淡の段階。0回は `0`、それ以外は `max` に対する割合で
 * `1`〜`STREAM_COUNT_LEVELS` にする。
 */
export function getStreamCountLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) {
    return 0
  }

  return Math.min(
    STREAM_COUNT_LEVELS,
    Math.ceil((count / max) * STREAM_COUNT_LEVELS),
  )
}

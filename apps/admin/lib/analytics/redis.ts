import { formatDateKey } from '@shinju-date/temporal-fns'
import { listDatesInRange } from './list-dates-in-range'

export interface ScoredMember {
  member: string
  score: number
}

/**
 * Turn the result of `zrange(..., { withScores: true })` (members and scores
 * in turn: `[member1, score1, member2, score2, ...]`) into pairs.
 *
 * Scores are read as numbers whether Redis returns them as numbers or as
 * strings. Members are always strings: `@upstash/redis` turns a member that
 * looks like a number (a keyword of digits only, for example) into a number,
 * so it is turned back.
 */
export function parseScoredMembers(
  result: readonly unknown[] | null | undefined,
): ScoredMember[] {
  const members: ScoredMember[] = []

  if (!result) {
    return members
  }

  for (let i = 0; i + 1 < result.length; i += 2) {
    const member = result[i]
    const score = Number(result[i + 1])

    if (member == null || Number.isNaN(score)) {
      continue
    }

    members.push({ member: String(member), score })
  }

  return members
}

/**
 * Sum the scores of the result of `zrange(..., { withScores: true })`.
 */
export function sumScores(
  result: readonly unknown[] | null | undefined,
): number {
  return parseScoredMembers(result).reduce(
    (total, { score }) => total + score,
    0,
  )
}

export interface DateRange {
  end: Temporal.PlainDate
  start: Temporal.PlainDate
}

/**
 * List the daily keys (`prefix` + `YYYYMMDD`) of every date from `start` to
 * `end` (both inclusive) in ascending order.
 *
 * Returns an empty array when `start` is after `end`.
 */
export function dailyKeys(prefix: string, { end, start }: DateRange): string[] {
  return listDatesInRange(start, end).map(
    (date) => `${prefix}${formatDateKey(date)}`,
  )
}

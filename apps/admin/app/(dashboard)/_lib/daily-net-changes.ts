import type { SummaryStats } from "@shinju-date/dashboard-stats";

import type { HistoricalStatsEntry } from "./get-historical-stats";

/** The net change of a count on a day, compared with the day before. */
export interface DailyNetChange {
  /** The day (ISO 8601, e.g. `2025-11-12`) */
  day: string;
  /**
   * The count at the end of the day minus the count at the end of the day
   * before, or `null` when either of the snapshots is missing
   */
  netChange: number | null;
}

/**
 * Compute the net changes of a count from the day before, for each day after
 * the first entry.
 *
 * Each change is computed from the snapshot of the day before by its date,
 * not from the entry before in the array, so days without a snapshot are not
 * treated as 0 or skipped over. A day is `null` when its own snapshot or the
 * one of the day before is missing.
 *
 * @param entries - The snapshots of the days, ordered from oldest to newest.
 * The first one is only used as the base of the second day.
 * @param key - The count to compare
 */
export const toDailyNetChanges = (
  entries: readonly HistoricalStatsEntry[],
  key: keyof SummaryStats
): DailyNetChange[] => {
  const countByDay = new Map(
    entries.map(({ day, stats }) => [day, stats?.[key] ?? null])
  );

  return entries.slice(1).map(({ day }) => {
    const current = countByDay.get(day) ?? null;
    const previous =
      countByDay.get(
        Temporal.PlainDate.from(day).subtract({ days: 1 }).toString()
      ) ?? null;

    return {
      day,
      netChange:
        current === null || previous === null ? null : current - previous,
    };
  });
};

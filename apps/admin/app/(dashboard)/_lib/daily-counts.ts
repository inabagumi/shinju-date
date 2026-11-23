import type { SummaryStats } from "@shinju-date/dashboard-stats";
import { formatDate } from "@shinju-date/temporal-fns";

import type { HistoricalStatsEntry } from "./get-historical-stats";

/** The count of a day, saved in the snapshot of the day. */
export interface DailyCount {
  /** The day to show on the chart (`MM/DD`) */
  date: string;
  /** The count in the snapshot of the day, or `null` without the snapshot */
  count: number | null;
}

/**
 * Pick a count from the snapshot of each day.
 *
 * The days without a snapshot are kept as `null`, not as 0 or left out, so
 * the chart shows them as missing at their own dates.
 *
 * @param entries - The snapshots of the days, ordered from oldest to newest
 * @param key - The count to pick
 */
export const toDailyCounts = (
  entries: readonly HistoricalStatsEntry[],
  key: keyof SummaryStats
): DailyCount[] =>
  entries.map(({ day, stats }) => ({
    count: stats?.[key] ?? null,
    // Use the same MM/DD format as the other screens of the admin UI
    date: formatDate(Temporal.PlainDate.from(day), { includeYear: false }),
  }));

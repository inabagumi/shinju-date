import type { SummaryStats } from "@shinju-date/dashboard-stats";

import type { HistoricalStatsEntry } from "./get-historical-stats";

/** The count of a day, saved in the snapshot of the day. */
export interface DailyCount {
  /** The count in the snapshot of the day, or `null` without the snapshot */
  count: number | null;
  /** The day (ISO 8601, e.g. `2025-11-12`) */
  day: string;
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
    day,
  }));

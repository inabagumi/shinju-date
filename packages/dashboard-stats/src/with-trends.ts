/** A value with its changes from the day before and the week before. */
export interface TrendValue {
  current: number;
  /** Change from the day before, or `null` when there is nothing to compare. */
  dayChange: number | null;
  /** Change from the week before, or `null` when there is nothing to compare. */
  weekChange: number | null;
}

/** Each value of `T` with its changes. */
export type WithTrends<T> = { [K in keyof T]: TrendValue };

/**
 * Pair each value with its changes from `yesterday` and `lastWeek` (the
 * snapshots). The change from a snapshot that is `null` is `null`.
 */
export function withTrends<T extends { [K in keyof T]: number }>(
  current: T,
  yesterday: T | null,
  lastWeek: T | null
): WithTrends<T> {
  const change = (key: keyof T, previous: T | null): number | null =>
    previous === null ? null : current[key] - previous[key];

  const trends = {} as WithTrends<T>;

  for (const key of Object.keys(current) as (keyof T)[]) {
    trends[key] = {
      current: current[key],
      dayChange: change(key, yesterday),
      weekChange: change(key, lastWeek),
    };
  }

  return trends;
}

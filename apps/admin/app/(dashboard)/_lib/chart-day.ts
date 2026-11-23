import { formatDate } from "@shinju-date/temporal-fns";

/** `Temporal.PlainDate` の `dayOfWeek`（月曜が 1）の順の曜日 */
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/**
 * グラフの日付の目盛り（`MM/DD`）。管理画面のほかの画面と同じ形にする
 *
 * @param day - The day (ISO 8601, e.g. `2025-11-12`)
 */
export const formatChartTick = (day: string): string =>
  formatDate(Temporal.PlainDate.from(day), { includeYear: false });

/**
 * ツールチップの日付（`YYYY/MM/DD（曜）`）。目盛りでは省く年と曜日も出す
 *
 * @param day - The day (ISO 8601, e.g. `2025-11-12`)
 */
export const formatChartDay = (day: string): string => {
  const date = Temporal.PlainDate.from(day);

  return `${formatDate(date)}（${WEEKDAYS[date.dayOfWeek - 1] ?? ""}）`;
};

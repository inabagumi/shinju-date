import type { SearchParamUpdates } from "@/lib/search-params-href";

/**
 * 期間（`from` と `to`）を書き換えるときに、`useUpdateSearchParams` に渡すパラメータを返す。
 *
 * `tab` などのほかのパラメータは指定しないので、引き継がれる。`date`（グラフで選んだ1日）は、
 * 新しい期間の外になるときだけ消す。
 *
 * クライアントコンポーネントから読み込むため、zod を読み込むファイル
 * （`search-params-schema.ts`）とは分けている。
 */
export const getDateRangeUpdates = (
  selectedDate: string | null,
  dateRange: { startDate: string; endDate: string }
): SearchParamUpdates => ({
  from: dateRange.startDate,
  to: dateRange.endDate,
  ...(selectedDate && !isWithinRange(selectedDate, dateRange)
    ? { date: null }
    : {}),
});

const isWithinRange = (
  date: string,
  dateRange: { startDate: string; endDate: string }
): boolean => {
  try {
    const target = Temporal.PlainDate.from(date);

    return (
      Temporal.PlainDate.compare(
        target,
        Temporal.PlainDate.from(dateRange.startDate)
      ) >= 0 &&
      Temporal.PlainDate.compare(
        target,
        Temporal.PlainDate.from(dateRange.endDate)
      ) <= 0
    );
  } catch {
    return false;
  }
};

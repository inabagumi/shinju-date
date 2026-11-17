import type { AnalyticsSearchParams } from './search-params-schema'

/** 集計の期間（両端を含む）。1日だけのときは、`start` と `end` が同じ日 */
export interface Period {
  end: Temporal.PlainDate
  start: Temporal.PlainDate
}

/**
 * URL のパラメータから、ウィジェットが集計する期間を決める。
 * グラフで日付が選ばれているときはその1日、そうでなければ選んだ期間全体。
 */
export function resolvePeriod({
  dateRange,
  selectedDate,
}: Pick<AnalyticsSearchParams, 'dateRange' | 'selectedDate'>): Period {
  if (selectedDate) {
    const date = Temporal.PlainDate.from(selectedDate)

    return { end: date, start: date }
  }

  return {
    end: Temporal.PlainDate.from(dateRange.endDate),
    start: Temporal.PlainDate.from(dateRange.startDate),
  }
}

import type { AnalyticsSearchParams } from './search-params-schema'

/**
 * 集計の期間（両端を含む、`YYYY-MM-DD`）。1日だけのときは、`start` と `end` が
 * 同じ日。取得関数のキャッシュのキーにするため、文字列で持つ
 */
export interface Period {
  end: string
  start: string
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
    const date = Temporal.PlainDate.from(selectedDate).toString()

    return { end: date, start: date }
  }

  return {
    end: Temporal.PlainDate.from(dateRange.endDate).toString(),
    start: Temporal.PlainDate.from(dateRange.startDate).toString(),
  }
}

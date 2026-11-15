/**
 * Create URL search params string for analytics date range and tab
 *
 * クライアントコンポーネントから読み込むため、zod を読み込むファイル
 * （`search-params-schema.ts`）とは分けている。
 */
export function createAnalyticsUrlParams(
  dateRange: { startDate: string; endDate: string },
  selectedDate?: string | null,
  tab?: string | null,
): string {
  const params = new URLSearchParams()

  if (selectedDate) {
    params.set('date', selectedDate)
  } else {
    params.set('from', dateRange.startDate)
    params.set('to', dateRange.endDate)
  }

  if (tab) {
    params.set('tab', tab)
  }

  return params.toString()
}

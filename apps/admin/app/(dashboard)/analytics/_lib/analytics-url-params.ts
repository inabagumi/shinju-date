/**
 * 現在のクエリを引き継いで、期間（`from` と `to`）だけを書き換えたクエリ文字列を返す。
 *
 * `tab` などのほかのパラメータは残す。`date`（グラフで選んだ1日）は、新しい期間の外になるときだけ消す。
 *
 * クライアントコンポーネントから読み込むため、zod を読み込むファイル
 * （`search-params-schema.ts`）とは分けている。
 */
export function updateDateRangeParams(
  searchParams: URLSearchParams,
  dateRange: { startDate: string; endDate: string },
): string {
  const params = new URLSearchParams(searchParams.toString())

  params.set('from', dateRange.startDate)
  params.set('to', dateRange.endDate)

  const selectedDate = params.get('date')
  if (selectedDate && !isWithinRange(selectedDate, dateRange)) {
    params.delete('date')
  }

  return params.toString()
}

function isWithinRange(
  date: string,
  dateRange: { startDate: string; endDate: string },
): boolean {
  try {
    const target = Temporal.PlainDate.from(date)

    return (
      Temporal.PlainDate.compare(
        target,
        Temporal.PlainDate.from(dateRange.startDate),
      ) >= 0 &&
      Temporal.PlainDate.compare(
        target,
        Temporal.PlainDate.from(dateRange.endDate),
      ) <= 0
    )
  } catch {
    return false
  }
}

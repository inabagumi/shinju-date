/** 曜日の1文字の表記。`dayOfWeek - 1` で引く（月曜始まり） */
export const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const

/**
 * 一覧を日付で区切る見出しの文字列。今日・昨日・明日はその言葉にし、
 * それ以外は「11月12日（木）」の形にする。今年でない日付には年も付ける。
 *
 * `toLocaleString` の出力はネイティブの Temporal と temporal-polyfill で
 * 異なり、ハイドレーションエラーの原因になるため使わない。
 */
export function formatDateHeading(
  date: Temporal.PlainDate,
  today: Temporal.PlainDate,
): string {
  const days = today.until(date, { largestUnit: 'day' }).days

  if (days === 0) {
    return '今日'
  }

  if (days === -1) {
    return '昨日'
  }

  if (days === 1) {
    return '明日'
  }

  const monthDay = `${date.month}月${date.day}日（${WEEKDAYS[date.dayOfWeek - 1]}）`

  return date.year === today.year ? monthDay : `${date.year}年${monthDay}`
}

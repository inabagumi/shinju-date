const numberFormatter = new Intl.NumberFormat('ja-JP')

/**
 * 数値をカンマ区切りの文字列にフォーマットします。
 * @param value フォーマットする数値
 * @returns フォーマット済みの文字列
 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

// このインスタンスは、モジュールがインポートされた時に一度だけ生成されます。
const numberFormatter = new Intl.NumberFormat('ja-JP')

/**
 * 数値をカンマ区切りの文字列にフォーマットします。
 * @param value フォーマットする数値
 * @returns フォーマット済みの文字列
 */
export function formatNumber(value: number): string {
  // 毎回生成するのではなく、既存のインスタンスを使いまわします。
  return numberFormatter.format(value)
}

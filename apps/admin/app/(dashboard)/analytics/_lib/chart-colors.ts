import type { CSSProperties } from 'react'

/**
 * Recharts に渡す色。`theme.css` のセマンティックカラーを CSS 変数で参照するため、
 * ライトとダークで自動的に切り替わる。
 */
export const CHART_COLORS = {
  /** ホバー中の棒の背景 */
  cursor: 'var(--color-muted)',
  foreground: 'var(--color-foreground)',
  /** グリッドと軸の線 */
  grid: 'var(--color-border)',
  /** 系列（線・面・棒） */
  series: 'var(--color-accent)',
  /** 目盛りの文字 */
  tick: 'var(--text-color-muted)',
} as const

export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-container)',
  color: 'var(--color-foreground)',
}

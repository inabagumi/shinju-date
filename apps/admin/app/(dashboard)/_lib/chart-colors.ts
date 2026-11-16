import type { CSSProperties } from 'react'

/**
 * Recharts に渡す色。`theme.css` のセマンティックカラーを CSS 変数で参照するため、
 * ライトとダークで自動的に切り替わる。ダッシュボードとアナリティクスのグラフは、
 * すべてここの色を使う。
 */
export const CHART_COLORS = {
  /** 既定の系列（線・面・棒） */
  accent: 'var(--color-accent)',
  /** ホバー中の棒の背景 */
  cursor: 'var(--color-muted)',
  foreground: 'var(--color-foreground)',
  /** グリッドと軸の線 */
  grid: 'var(--color-border)',
  /** 良い状態を表す系列 */
  success: 'var(--color-success)',
  /** 目盛りの文字 */
  tick: 'var(--text-color-muted)',
  /** 注意を表す系列 */
  warning: 'var(--color-warning)',
} as const

/** 軸の目盛りの文字 */
export const CHART_AXIS_TICK = {
  fill: CHART_COLORS.tick,
  fontSize: 12,
} as const

export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: 'var(--color-surface)',
  border: `1px solid ${CHART_COLORS.grid}`,
  borderRadius: 'var(--radius-container)',
  color: CHART_COLORS.foreground,
}

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: CHART_COLORS.foreground,
}

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: CHART_COLORS.foreground,
  fontWeight: 600,
}

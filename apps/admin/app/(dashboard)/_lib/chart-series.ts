/**
 * グラフの1系列（線・面・棒）の定義。
 *
 * 色は、Recharts の色の props（`fill`、`stroke`、`stopColor`）に `currentColor` を渡し、
 * `className` の `text-*`（`theme.css` のセマンティックカラー）で指定する。
 * クラスで書くと、エディターの補完や色の表示、Biome のクラスの並べ替えが効き、
 * ライトとダークも自動で切り替わる。
 */
export interface ChartSeries {
  /** 系列の色のクラス（例: `text-accent`） */
  className: string
  /** データの中の、この系列の値のキー */
  key: string
  /** ツールチップと凡例に出す系列の名前 */
  label: string
}

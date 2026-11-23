/** 動画サマリーのグラフで選べる期間（日数） */
export const CHART_PERIODS = [7, 30] as const;

export type ChartPeriod = (typeof CHART_PERIODS)[number];

/** 最初に出す期間 */
export const DEFAULT_CHART_PERIOD: ChartPeriod = 7;

/** 選べる期間のうち最も長いもの。履歴はこの期間ぶんをまとめて読む */
export const MAX_CHART_PERIOD: ChartPeriod = 30;

/** 選んだ期間を持つ URL のパラメータの名前（例: `/?period=30`） */
export const CHART_PERIOD_PARAM = "period";

/**
 * URL のパラメータの値を期間にする。ない値や選べない値（`14`、`abc` など）は最初の期間にする
 */
export const parseChartPeriod = (value: string | null): ChartPeriod =>
  CHART_PERIODS.find((period) => period.toString(10) === value) ??
  DEFAULT_CHART_PERIOD;

/** 期間の選択肢の名前（例: `過去7日間`） */
export const getChartPeriodLabel = (period: ChartPeriod): string =>
  `過去${period.toString(10)}日間`;

/**
 * 期間の日別純増減に要るスナップショットの日数。最初の日と比べる前日の1日を足す
 * （7日間なら8日分、30日間なら31日分）
 */
export const getRequiredSnapshotDays = (period: number): number => period + 1;

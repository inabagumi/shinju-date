import type { SummaryStats } from "@shinju-date/dashboard-stats";

import { getRequiredSnapshotDays } from "./chart-periods";
import type { ChartPeriod } from "./chart-periods";
import { toDailyCounts } from "./daily-counts";
import type { DailyCount } from "./daily-counts";
import { toDailyNetChanges } from "./daily-net-changes";
import type { DailyNetChange } from "./daily-net-changes";
import type { HistoricalStatsEntry } from "./get-historical-stats";

/** 件数の推移を小さなグラフで出す系列 */
export interface CountChart {
  /** 線の色のクラス。グラフどうしで区別できるようにする */
  className: string;
  /** 見出しの下に出す、数えている動画の説明 */
  description: string;
  key: keyof SummaryStats;
  /** ツールチップに出す系列の名前。サマリーカードの名前と揃える */
  label: string;
}

/**
 * 総動画数に比べて桁の小さい件数。総動画数と同じ軸に載せると変化が読めないので、
 * それぞれ独立した軸のグラフにする
 */
export const COUNT_CHARTS: CountChart[] = [
  {
    className: "text-accent",
    description: "公開中で、配信前の動画の本数です。",
    key: "scheduledVideos",
    label: "配信予定",
  },
  {
    className: "text-warning",
    description: "非表示にした動画の本数です。削除した動画は含みません。",
    key: "hiddenVideos",
    label: "非表示",
  },
];

/** 日別純増減のグラフの見出し */
export const getNetChangeChartTitle = (period: ChartPeriod): string =>
  `動画数の日別純増減（${period.toString(10)}日間）`;

/** 日別純増減のグラフの値の説明 */
export const NET_CHANGE_CHART_DESCRIPTION =
  "各日の終わりの総動画数と、前日の終わりとの差です。削除による減少を含む純増減のため、新規登録数とは一致しません。集計のない日は空欄になります。";

/** 件数のグラフの見出し */
export const getCountChartTitle = (
  { label }: CountChart,
  period: ChartPeriod
): string => `${label}の推移（${period.toString(10)}日間）`;

/** 件数のグラフの値の説明。すべての件数のグラフに共通する */
export const COUNT_CHART_NOTE =
  "各日の翌日0時過ぎに集計した本数です。今日の本数はグラフに含めず、上のカードに出しています。集計のない日は線が途切れます。";

/** 選んだ期間の、動画サマリーのグラフの値 */
export interface VideoSummaryChartData {
  /** 件数のグラフの値。`COUNT_CHARTS` の `key` ごと */
  counts: Partial<Record<keyof SummaryStats, DailyCount[]>>;
  /** 期間に要るスナップショットのうち、ない日の数 */
  missingSnapshotDays: number;
  /** 総動画数の日別純増減 */
  netChanges: DailyNetChange[];
  /** 期間に要るスナップショットの日数。最初の日と比べる前日を含む */
  requiredSnapshotDays: number;
}

/**
 * 最も長い期間ぶん読んだスナップショットから、選んだ期間のグラフの値を作る。
 * 期間を切り替えても、履歴を読み直さずに済む
 *
 * @param history - The snapshots of the days up to yesterday, ordered from
 * oldest to newest, with the day before the first day of the longest period
 * @param period - The number of the days to chart
 */
export const toVideoSummaryChartData = (
  history: readonly HistoricalStatsEntry[],
  period: ChartPeriod
): VideoSummaryChartData => {
  const requiredSnapshotDays = getRequiredSnapshotDays(period);
  // The day before the first day is the base of the first change
  const entries = history.slice(-requiredSnapshotDays);
  // The same days as the net changes, without the base of the first change
  const countEntries = entries.slice(1);

  return {
    counts: Object.fromEntries(
      COUNT_CHARTS.map(({ key }) => [key, toDailyCounts(countEntries, key)])
    ),
    missingSnapshotDays:
      requiredSnapshotDays -
      entries.filter(({ stats }) => stats !== null).length,
    netChanges: toDailyNetChanges(entries, "totalVideos"),
    requiredSnapshotDays,
  };
};

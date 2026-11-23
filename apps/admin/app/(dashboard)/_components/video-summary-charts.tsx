"use client";

import { formatNumber } from "@shinju-date/helpers";
import { Alert } from "@shinju-date/ui";
import { useState } from "react";

import {
  DEFAULT_CHART_PERIOD,
  getChartPeriodLabel,
} from "../_lib/chart-periods";
import type { ChartPeriod } from "../_lib/chart-periods";
import type { HistoricalStatsEntry } from "../_lib/get-historical-stats";
import {
  COUNT_CHART_NOTE,
  COUNT_CHARTS,
  getCountChartTitle,
  getNetChangeChartTitle,
  NET_CHANGE_CHART_DESCRIPTION,
  toVideoSummaryChartData,
} from "../_lib/video-summary-charts";
import { ChartPeriodToggle } from "./chart-period-toggle";
import { VideoCountChartEmpty } from "./video-count-chart-empty";
import { VideoCountChartUI } from "./video-count-chart-ui";
import { VideoStatsChartEmpty } from "./video-stats-chart-empty";
import { VideoStatsChartUI } from "./video-stats-chart-ui";

interface VideoSummaryChartsProps {
  /**
   * 最も長い期間ぶんのスナップショット（古い方から）。期間を切り替えるときは、
   * この中から選んだ期間の日を取り出し、履歴を読み直さない
   */
  history: HistoricalStatsEntry[];
}

interface MissingSnapshotsNoticeProps {
  /** 期間に要るスナップショットのうち、ない日の数 */
  missingDays: number;
  period: ChartPeriod;
  /** 期間に要るスナップショットの日数 */
  requiredDays: number;
}

/**
 * 期間に要るスナップショットの一部がないことの知らせ。すべてないときは、各グラフの
 * 空の状態が説明するので出さない
 */
const MissingSnapshotsNotice = ({
  missingDays,
  period,
  requiredDays,
}: MissingSnapshotsNoticeProps) => (
  <Alert className="mt-4" title="集計のない日があります">
    {getChartPeriodLabel(period)}のグラフに要る{formatNumber(requiredDays)}
    日分（最初の日と比べる前日を含む）のうち、{formatNumber(missingDays)}
    日分の集計がありません。集計を始める前の日や、保存期間を過ぎた日、集計に失敗した日の値は後から戻らないため、空欄のままです。
  </Alert>
);

/**
 * 動画サマリーのグラフ。総動画数の日別純増減と、配信予定・非表示の件数の推移を、
 * 選んだ同じ期間で出す。上のサマリーカード（現在の値）は期間によらない
 */
export const VideoSummaryCharts = ({ history }: VideoSummaryChartsProps) => {
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_CHART_PERIOD);
  const { counts, missingSnapshotDays, netChanges, requiredSnapshotDays } =
    toVideoSummaryChartData(history, period);

  return (
    <>
      <div className="mt-6">
        <ChartPeriodToggle onChange={setPeriod} value={period} />
        {missingSnapshotDays > 0 &&
          missingSnapshotDays < requiredSnapshotDays && (
            <MissingSnapshotsNotice
              missingDays={missingSnapshotDays}
              period={period}
              requiredDays={requiredSnapshotDays}
            />
          )}
      </div>

      <div className="mt-6">
        <h3 className="text-body leading-normal font-semibold">
          {getNetChangeChartTitle(period)}
        </h3>
        <p className="mb-3 text-meta text-muted">
          {NET_CHANGE_CHART_DESCRIPTION}
        </p>
        {netChanges.every(({ netChange }) => netChange === null) ? (
          <VideoStatsChartEmpty />
        ) : (
          <VideoStatsChartUI data={netChanges} />
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {COUNT_CHARTS.map((chart) => {
          const data = counts[chart.key] ?? [];

          return (
            <section key={chart.key}>
              <h3 className="text-body leading-normal font-semibold">
                {getCountChartTitle(chart, period)}
              </h3>
              <p className="mb-3 text-meta text-muted">{chart.description}</p>
              {data.every(({ count }) => count === null) ? (
                <VideoCountChartEmpty />
              ) : (
                <VideoCountChartUI
                  className={chart.className}
                  data={data}
                  label={chart.label}
                />
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-meta text-muted">{COUNT_CHART_NOTE}</p>
    </>
  );
};

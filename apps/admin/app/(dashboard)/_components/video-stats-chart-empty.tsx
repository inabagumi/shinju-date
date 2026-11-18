import { EmptyState } from "@shinju-date/ui";
import { ChartColumn } from "lucide-react";

/**
 * Compact placeholder for the 7-day video stats chart when no snapshot has
 * been recorded yet. It explains when the data becomes available instead of
 * leaving a chart-sized blank area.
 */
export const VideoStatsChartEmpty = () => (
  <EmptyState
    className="rounded-container border border-dashed border-border"
    description="動画数は毎日0時過ぎに前日分を集計します。集計が済むと、ここに推移が表示されます。"
    icon={<ChartColumn />}
    title="まだ集計されたデータがありません"
  />
);

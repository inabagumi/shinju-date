import { EmptyState } from "@shinju-date/ui";
import { ChartLine } from "lucide-react";

/**
 * Compact placeholder for the chart of a count of the videos when no day has
 * a snapshot yet. It explains when the data becomes available instead of
 * leaving a chart-sized blank area.
 */
export const VideoCountChartEmpty = () => (
  <EmptyState
    className="rounded-container border border-dashed border-border"
    description="動画数は毎日0時過ぎに前日分を集計します。集計が済むと、ここに推移が表示されます。"
    icon={<ChartLine />}
    title="まだ集計されたデータがありません"
  />
);

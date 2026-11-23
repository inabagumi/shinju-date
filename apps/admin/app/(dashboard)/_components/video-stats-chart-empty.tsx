import { EmptyState } from "@shinju-date/ui";
import { ChartColumn } from "lucide-react";

/**
 * Compact placeholder for the chart of the daily net changes of the videos
 * when no change can be computed yet, that is, there are no snapshots of two
 * days in a row. It explains when the data becomes available instead of
 * leaving a chart-sized blank area.
 */
export const VideoStatsChartEmpty = () => (
  <EmptyState
    className="rounded-container border border-dashed border-border"
    description="動画数は毎日0時過ぎに前日分を集計します。続けて2日分の集計が済むと、ここに日別の増減が表示されます。"
    icon={<ChartColumn />}
    title="まだ集計されたデータがありません"
  />
);

"use client";

import { useChartWidth, XAxis } from "recharts";

/** これより狭いグラフでは、日付が重ならないように斜めにする */
const NARROW_CHART_WIDTH = 480;

/**
 * 日付の軸。欠損日を含むすべての日付を出し、狭いグラフでは斜めにする。
 * グラフの幅を読むため、グラフの子のコンポーネントにする
 */
export const ChartDateAxis = () => {
  const isNarrow = (useChartWidth() ?? 0) < NARROW_CHART_WIDTH;

  return (
    <XAxis
      angle={isNarrow ? -45 : 0}
      axisLine={{ stroke: "currentColor" }}
      dataKey="date"
      height={isNarrow ? 45 : 30}
      interval={0}
      textAnchor={isNarrow ? "end" : "middle"}
      tick={{
        className: "text-muted",
        fill: "currentColor",
        fontSize: 12,
      }}
      tickLine={{ stroke: "currentColor" }}
    />
  );
};

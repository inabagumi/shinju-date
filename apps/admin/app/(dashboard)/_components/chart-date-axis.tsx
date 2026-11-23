"use client";

import { useChartWidth, XAxis } from "recharts";
import type { XAxisProps } from "recharts";

interface ChartDateAxisProps {
  /**
   * 両端の余白。折れ線グラフは両端の日の点を軸の端に置くので、点と日付が切れないようにする
   */
  padding?: NonNullable<XAxisProps["padding"]>;
}

/** 余白なし（Recharts の既定値と同じ） */
const NO_PADDING = { left: 0, right: 0 };

/** これより狭いグラフでは、日付が重ならないように斜めにする */
const NARROW_CHART_WIDTH = 480;

/**
 * 日付の軸。欠損日を含むすべての日付を出し、狭いグラフでは斜めにする。
 * グラフの幅を読むため、グラフの子のコンポーネントにする
 */
export const ChartDateAxis = ({ padding = NO_PADDING }: ChartDateAxisProps) => {
  const isNarrow = (useChartWidth() ?? 0) < NARROW_CHART_WIDTH;

  return (
    <XAxis
      angle={isNarrow ? -45 : 0}
      axisLine={{ stroke: "currentColor" }}
      dataKey="date"
      height={isNarrow ? 45 : 30}
      interval={0}
      padding={padding}
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

"use client";

import { useChartWidth, usePlotArea, XAxis } from "recharts";
import type { XAxisProps } from "recharts";

import { formatChartTick } from "../_lib/chart-day";

interface ChartDateAxisProps {
  /** グラフのすべての日（ISO 8601）。古い方から並べる */
  days: readonly string[];
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
 * 隣の日付と重ならないために、目盛りの間にとる幅（px）。`MM/DD` を 12px で書いた幅に、
 * 隙間を足したもの。斜めの日付は、横に並べるより詰めても重ならない
 */
const MIN_TICK_SPACING = { aslant: 28, level: 48 } as const;

/**
 * 日付を間引くときの間隔（日）。1週間ごとなら、同じ曜日の日付が並ぶ
 */
const TICK_STEPS = [1, 2, 3, 7, 14] as const;

/**
 * 目盛りを出す日。重ならない間隔のうち最も短いもので、最も新しい日（昨日）から数えて間引く。
 * グラフの幅がわからないうち（測る前）は、すべての日を出す
 */
export const getTickDays = (
  days: readonly string[],
  plotWidth: number,
  minSpacing: number
): string[] => {
  if (plotWidth <= 0 || days.length === 0) {
    return [...days];
  }

  const spacing = plotWidth / days.length;
  const step =
    TICK_STEPS.find((candidate) => spacing * candidate >= minSpacing) ??
    Math.ceil(minSpacing / spacing);

  return days.filter((_, index) => (days.length - 1 - index) % step === 0);
};

/**
 * 日付の軸。日付が重ならない限り、欠損日を含むすべての日付を出す。30日間のように
 * 日が多いときは、昨日から一定の間隔で間引く。狭いグラフでは斜めにする。
 * グラフの幅を読むため、グラフの子のコンポーネントにする
 */
export const ChartDateAxis = ({
  days,
  padding = NO_PADDING,
}: ChartDateAxisProps) => {
  const isNarrow = (useChartWidth() ?? 0) < NARROW_CHART_WIDTH;
  const plotWidth = usePlotArea()?.width ?? 0;
  const ticks = getTickDays(
    days,
    plotWidth,
    isNarrow ? MIN_TICK_SPACING.aslant : MIN_TICK_SPACING.level
  );

  return (
    <XAxis
      angle={isNarrow ? -45 : 0}
      axisLine={{ stroke: "currentColor" }}
      dataKey="day"
      height={isNarrow ? 45 : 30}
      interval={0}
      padding={padding}
      textAnchor={isNarrow ? "end" : "middle"}
      tick={{
        className: "text-muted",
        fill: "currentColor",
        fontSize: 12,
      }}
      tickFormatter={formatChartTick}
      tickLine={{ stroke: "currentColor" }}
      ticks={ticks}
    />
  );
};

"use client";

import { formatNumber } from "@shinju-date/helpers";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import type { AxisDomain, BarShapeProps } from "recharts";

import type { ChartSeries } from "../_lib/chart-series";
import type { DailyNetChange } from "../_lib/daily-net-changes";
import { ChartDateAxis } from "./chart-date-axis";
import { ChartTooltipContent } from "./chart-tooltip-content";

interface VideoStatsChartProps {
  data: DailyNetChange[];
}

const SERIES: ChartSeries[] = [
  {
    className: "text-foreground",
    key: "netChange",
    label: "純増減",
  },
];

/** 増加・減少・変化なしの値の色のクラス */
const getChangeClassName = (value: number): string => {
  if (value > 0) {
    return "text-success";
  }

  if (value < 0) {
    return "text-danger";
  }

  return "text-muted";
};

/** 符号付きの件数（`+12`、`-3`、`±0`） */
const formatChange = (value: number): string => {
  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  if (value < 0) {
    return `-${formatNumber(-value)}`;
  }

  return "±0";
};

const formatValue = (value: number): string => `${formatChange(value)} 本`;

/**
 * 棒の上の値。値がない日（比べるスナップショットがない日）は棒も値も出さず、
 * ツールチップで「データなし」と示す。0 の日は `±0` と出して区別する
 */
const formatLabel = (value: unknown): string =>
  typeof value === "number" ? formatChange(value) : "";

/**
 * 0 を中心に、正負の両方向を同じ幅で表示する。増減のどちらかしかない日や、
 * すべて 0 の日でも、0 の基準線と正負の目盛りが出る
 */
const DOMAIN: AxisDomain = ([dataMin, dataMax]) => {
  const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax), 1);

  return [-absMax, absMax];
};

/** 棒を値の符号の色で描く */
const ChangeBar = (props: BarShapeProps) => {
  const value = (props.payload as DailyNetChange | undefined)?.netChange;

  return (
    <Rectangle
      {...props}
      className={typeof value === "number" ? getChangeClassName(value) : ""}
      fill="currentColor"
    />
  );
};

export const VideoStatsChartUI = ({ data }: VideoStatsChartProps) => (
  // 線（グリッド、軸、目盛りの線）は `currentColor` にして、グラフのルートの
  // `text-border` を使う。`CartesianGrid` は `className` を線に渡さないため
  <div className="h-80 w-full">
    <ResponsiveContainer height="100%" width="100%">
      <BarChart
        className="text-border"
        data={data}
        margin={{ bottom: 5, left: 0, right: 10, top: 20 }}
      >
        <CartesianGrid stroke="currentColor" strokeDasharray="3 3" />
        <ChartDateAxis />
        <YAxis
          allowDecimals={false}
          axisLine={{ stroke: "currentColor" }}
          domain={DOMAIN}
          tick={{
            className: "text-muted",
            fill: "currentColor",
            fontSize: 12,
          }}
          tickFormatter={formatChange}
          tickLine={{ stroke: "currentColor" }}
          // 目盛りの値に合わせた幅にして、狭い画面で日付の幅を確保する
          width="auto"
        />
        <Tooltip
          content={
            <ChartTooltipContent formatValue={formatValue} series={SERIES} />
          }
          // ホバー中の背景。`fill-*` のクラスは SVG の `fill` 属性より優先される
          cursor={{ className: "fill-muted" }}
          // 値がない日も、ツールチップで「データなし」と示す
          filterNull={false}
        />
        {/* 0 の基準線。グリッドの線より濃くする */}
        <ReferenceLine
          className="text-muted"
          stroke="currentColor"
          strokeWidth={1.5}
          y={0}
        />
        <Bar
          dataKey="netChange"
          name="純増減"
          radius={[4, 4, 0, 0]}
          shape={ChangeBar}
        >
          <LabelList
            className="text-muted"
            dataKey="netChange"
            fill="currentColor"
            fontSize={12}
            formatter={formatLabel}
            position="top"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

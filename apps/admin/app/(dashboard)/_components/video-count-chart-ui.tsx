"use client";

import { formatNumber } from "@shinju-date/helpers";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import type { AxisDomain } from "recharts";

import { formatChartDay } from "../_lib/chart-day";
import type { ChartSeries } from "../_lib/chart-series";
import type { DailyCount } from "../_lib/daily-counts";
import { ChartDateAxis } from "./chart-date-axis";
import { ChartTooltipContent } from "./chart-tooltip-content";

interface VideoCountChartUIProps {
  data: DailyCount[];
  /** 線の色のクラス（例: `text-accent`） */
  className: string;
  /** ツールチップに出す系列の名前 */
  label: string;
}

const formatValue = (value: number): string => `${formatNumber(value)} 本`;

/**
 * これより小さい値があると、横ばいの値を中心にとる目盛りが負になるので、下端を 0 にする
 */
const MIN_COUNT_FOR_AUTO_LOWER_BOUND = 2;

/**
 * Y軸の範囲。数十本の系列でも数本の変化が読めるように、0 から始めずに値の範囲に合わせる。
 * `auto` にすると、Recharts が範囲をきりのよい目盛りまで広げ、横ばいの日も値を中心に目盛りを振る
 */
const getDomain = (data: readonly DailyCount[]): AxisDomain => {
  const minCount = Math.min(
    ...data.flatMap(({ count }) => (count === null ? [] : [count]))
  );

  return [minCount < MIN_COUNT_FOR_AUTO_LOWER_BOUND ? 0 : "auto", "auto"];
};

/**
 * 1つの件数の日ごとの推移を示す小さな折れ線グラフ。Y軸はこのグラフの値だけで決める。
 * 欠損日は 0 にせず線を途切れさせ、前後が欠損の日も点で見えるように、すべての日に点を打つ
 */
export const VideoCountChartUI = ({
  className,
  data,
  label,
}: VideoCountChartUIProps) => {
  const series: ChartSeries[] = [{ className, key: "count", label }];

  return (
    // 線（グリッド、軸、目盛りの線）は `currentColor` にして、グラフのルートの
    // `text-border` を使う。`CartesianGrid` は `className` を線に渡さないため
    <div className="h-48 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          className="text-border"
          data={data}
          margin={{ bottom: 5, left: 0, right: 10, top: 10 }}
        >
          <CartesianGrid stroke="currentColor" strokeDasharray="3 3" />
          <ChartDateAxis
            days={data.map(({ day }) => day)}
            padding={{ left: 20, right: 20 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={{ stroke: "currentColor" }}
            domain={getDomain(data)}
            // 範囲の端の値の点が、軸の線に重ならないようにする
            padding={{ bottom: 8, top: 8 }}
            tick={{
              className: "text-muted",
              fill: "currentColor",
              fontSize: 12,
            }}
            tickFormatter={formatNumber}
            tickLine={{ stroke: "currentColor" }}
            // 目盛りの値に合わせた幅にして、狭い画面で日付の幅を確保する
            width="auto"
          />
          <Tooltip
            content={
              <ChartTooltipContent
                formatLabel={formatChartDay}
                formatValue={formatValue}
                series={series}
              />
            }
            cursor={{ stroke: "currentColor" }}
            // 値がない日も、ツールチップで「データなし」と示す
            filterNull={false}
          />
          <Line
            // ホバー中の点は系列の外に描かれるので、点にも色のクラスを付ける
            activeDot={{ className, fill: "currentColor", r: 5 }}
            className={className}
            dataKey="count"
            dot={{ className, fill: "currentColor", r: 3 }}
            name={label}
            stroke="currentColor"
            strokeWidth={2}
            // 日ごとの値をそのまま結び、曲線で間の値を作らない
            type="linear"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

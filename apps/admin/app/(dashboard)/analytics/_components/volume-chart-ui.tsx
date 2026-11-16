'use client'

import { formatNumber } from '@shinju-date/helpers'
import { useId } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  type MouseHandlerDataParam,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipContent } from '../../_components/chart-tooltip-content'
import type { ChartSeries } from '../../_lib/chart-series'
import { formatDateLabel } from '../_lib/format-date'
import { useSelectedDateParam } from '../_lib/use-selected-date-param'

/** 1日分のデータ。`date` のほかに、系列のキーごとの件数を持つ */
export interface VolumeChartDatum {
  [key: string]: number | string
  date: string
}

/** `bar` は棒グラフ、`area` は面グラフ */
export type VolumeChartVariant = 'area' | 'bar'

interface VolumeChartUIProps {
  data: VolumeChartDatum[]
  series: ChartSeries[]
  variant: VolumeChartVariant
}

function formatTooltipValue(value: number): string {
  return `${formatNumber(value)} 回`
}

function formatTick(value: string): string {
  return formatDateLabel(value, { includeYear: false })
}

/**
 * 日ごとの件数のグラフ。日を選ぶと、URL の `date` を書き換える。
 */
export function VolumeChartUI({ data, series, variant }: VolumeChartUIProps) {
  const { toggleDate } = useSelectedDateParam()
  // 同じページに複数のグラフがあっても、グラデーションの ID が重ならないようにする
  const gradientIdPrefix = useId()

  const handleClick = ({ activeLabel }: MouseHandlerDataParam) => {
    if (typeof activeLabel === 'string' && activeLabel) {
      toggleDate(activeLabel)
    }
  }

  // 線（グリッド、軸、目盛りの線）は `currentColor` にして、グラフのルートの
  // `text-border` を使う。`CartesianGrid` は `className` を線に渡さないため
  const axes = (
    <>
      <CartesianGrid stroke="currentColor" strokeDasharray="3 3" />
      <XAxis
        axisLine={{ stroke: 'currentColor' }}
        dataKey="date"
        tick={{ className: 'text-muted', fill: 'currentColor', fontSize: 12 }}
        tickFormatter={formatTick}
        tickLine={{ stroke: 'currentColor' }}
      />
      <YAxis
        axisLine={{ stroke: 'currentColor' }}
        tick={{ className: 'text-muted', fill: 'currentColor', fontSize: 12 }}
        tickLine={{ stroke: 'currentColor' }}
      />
      <Tooltip
        content={
          <ChartTooltipContent
            formatLabel={formatDateLabel}
            formatValue={formatTooltipValue}
            series={series}
          />
        }
        // 棒グラフのホバー中の背景。`fill-*` のクラスは SVG の `fill` 属性より優先される。
        // 面グラフは、既定の縦線のカーソルのままにする
        cursor={variant === 'bar' ? { className: 'fill-muted' } : true}
      />
    </>
  )

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        {variant === 'bar' ? (
          <BarChart className="text-border" data={data} onClick={handleClick}>
            {axes}
            {series.map((item) => (
              <Bar
                className={item.className}
                cursor="pointer"
                dataKey={item.key}
                fill="currentColor"
                key={item.key}
                name={item.label}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart className="text-border" data={data} onClick={handleClick}>
            <defs>
              {series.map((item) => (
                <linearGradient
                  className={item.className}
                  id={`${gradientIdPrefix}-${item.key}`}
                  key={item.key}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="currentColor"
                    stopOpacity={0.3}
                  />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {series.map((item) => (
              <Area
                // ホバー中の点は系列の外に描かれるので、点にも色のクラスを付ける
                activeDot={{ className: item.className }}
                className={item.className}
                cursor="pointer"
                dataKey={item.key}
                fill={`url(#${gradientIdPrefix}-${item.key})`}
                fillOpacity={1}
                key={item.key}
                name={item.label}
                stroke="currentColor"
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

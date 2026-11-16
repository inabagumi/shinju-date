'use client'

import { formatNumber } from '@shinju-date/helpers'
import { type ReactNode, useId } from 'react'
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
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '../../_lib/chart-colors'
import { formatDateLabel } from '../_lib/format-date'
import { useSelectedDateParam } from '../_lib/use-selected-date-param'

/** グラフの1系列（線・面・棒）の定義 */
export interface VolumeChartSeries {
  /** 系列の色（`CHART_COLORS` の値） */
  color: string
  /** データの中の、この系列の値のキー */
  key: string
  /** ツールチップに出す系列の名前 */
  label: string
}

/** 1日分のデータ。`date` のほかに、系列のキーごとの件数を持つ */
export interface VolumeChartDatum {
  [key: string]: number | string
  date: string
}

/** `bar` は棒グラフ、`area` は面グラフ */
export type VolumeChartVariant = 'area' | 'bar'

interface VolumeChartUIProps {
  data: VolumeChartDatum[]
  series: VolumeChartSeries[]
  variant: VolumeChartVariant
}

function formatTooltipValue(value: unknown): string {
  return `${formatNumber(typeof value === 'number' ? value : 0)} 回`
}

function formatTooltipLabel(label: ReactNode): ReactNode {
  return typeof label === 'string' ? formatDateLabel(label) : label
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

  const axes = (
    <>
      <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
      <XAxis
        axisLine={{ stroke: CHART_COLORS.grid }}
        dataKey="date"
        tick={CHART_AXIS_TICK}
        tickFormatter={formatTick}
        tickLine={{ stroke: CHART_COLORS.grid }}
      />
      <YAxis
        axisLine={{ stroke: CHART_COLORS.grid }}
        tick={CHART_AXIS_TICK}
        tickLine={{ stroke: CHART_COLORS.grid }}
      />
      <Tooltip
        contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
        // 面グラフは、既定の縦線のカーソルのままにする
        cursor={variant === 'bar' ? { fill: CHART_COLORS.cursor } : true}
        formatter={(value, name) => [formatTooltipValue(value), name]}
        itemStyle={CHART_TOOLTIP_ITEM_STYLE}
        labelFormatter={formatTooltipLabel}
        labelStyle={CHART_TOOLTIP_LABEL_STYLE}
      />
    </>
  )

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        {variant === 'bar' ? (
          <BarChart data={data} onClick={handleClick}>
            {axes}
            {series.map((item) => (
              <Bar
                cursor="pointer"
                dataKey={item.key}
                fill={item.color}
                key={item.key}
                name={item.label}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data} onClick={handleClick}>
            <defs>
              {series.map((item) => (
                <linearGradient
                  id={`${gradientIdPrefix}-${item.key}`}
                  key={item.key}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {series.map((item) => (
              <Area
                cursor="pointer"
                dataKey={item.key}
                fill={`url(#${gradientIdPrefix}-${item.key})`}
                fillOpacity={1}
                key={item.key}
                name={item.label}
                stroke={item.color}
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

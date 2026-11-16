'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartSeries } from '../_lib/chart-series'
import { ChartLegendContent } from './chart-legend-content'
import { ChartTooltipContent } from './chart-tooltip-content'

interface VideoStatsChartProps {
  data: Array<{
    date: string
    visibleVideos: number
    scheduledVideos: number
    hiddenVideos: number
    deletedVideos: number
  }>
}

interface VideoStatsSeries extends ChartSeries {
  /** 同じ値の系列は積み上げる */
  stackId: string
}

const SERIES: VideoStatsSeries[] = [
  {
    className: 'text-success',
    key: 'visibleVideos',
    label: '公開中',
    stackId: 'visible',
  },
  {
    className: 'text-accent',
    key: 'scheduledVideos',
    label: '配信予定',
    stackId: 'visible',
  },
  {
    className: 'text-warning',
    key: 'hiddenVideos',
    label: '非表示',
    stackId: 'hidden',
  },
]

function formatValue(value: number): string {
  return `${value} 本`
}

export function VideoStatsChartUI({ data }: VideoStatsChartProps) {
  // 線（グリッド、目盛りの線）は `currentColor` にして、グラフのルートの
  // `text-border` を使う。`CartesianGrid` は `className` を線に渡さないため
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart className="text-border" data={data}>
          <CartesianGrid stroke="currentColor" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{
              className: 'text-muted',
              fill: 'currentColor',
              fontSize: 12,
            }}
            tickLine={{ stroke: 'currentColor' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{
              className: 'text-muted',
              fill: 'currentColor',
              fontSize: 12,
            }}
            tickLine={{ stroke: 'currentColor' }}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                colorItems
                formatValue={formatValue}
                series={SERIES}
              />
            }
          />
          <Legend content={<ChartLegendContent series={SERIES} />} />
          {SERIES.map((item) => (
            <Area
              // ホバー中の点は系列の外に描かれるので、点にも色のクラスを付ける
              activeDot={{ className: item.className }}
              className={item.className}
              dataKey={item.key}
              fill="currentColor"
              fillOpacity={0.15}
              key={item.key}
              stackId={item.stackId}
              stroke="currentColor"
              type="monotone"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

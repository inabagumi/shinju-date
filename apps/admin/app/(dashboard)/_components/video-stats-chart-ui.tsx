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
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from '../_lib/chart-colors'

interface VideoStatsChartProps {
  data: Array<{
    date: string
    visibleVideos: number
    scheduledVideos: number
    hiddenVideos: number
    deletedVideos: number
  }>
}

// Label mapping for chart legend and tooltip
const LABEL_MAP: Record<string, string> = {
  hiddenVideos: '非表示',
  scheduledVideos: '配信予定',
  visibleVideos: '公開中',
} as const

export function VideoStatsChartUI({ data }: VideoStatsChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={CHART_AXIS_TICK}
            tickLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={CHART_AXIS_TICK}
            tickLine={{ stroke: CHART_COLORS.grid }}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
            formatter={(value, name) => [
              `${value ?? 0} 本`,
              LABEL_MAP[String(name ?? '')] || String(name ?? ''),
            ]}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          />
          <Legend
            formatter={(value) => LABEL_MAP[String(value)] || String(value)}
            iconType="rect"
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Area
            dataKey="visibleVideos"
            fill={CHART_COLORS.success}
            fillOpacity={0.15}
            stackId="visible"
            stroke={CHART_COLORS.success}
            type="monotone"
          />
          <Area
            dataKey="scheduledVideos"
            fill={CHART_COLORS.accent}
            fillOpacity={0.15}
            stackId="visible"
            stroke={CHART_COLORS.accent}
            type="monotone"
          />
          <Area
            dataKey="hiddenVideos"
            fill={CHART_COLORS.warning}
            fillOpacity={0.15}
            stroke={CHART_COLORS.warning}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

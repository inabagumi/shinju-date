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
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-color-muted)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-color-muted)', fontSize: 12 }}
            tickLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-container)',
              color: 'var(--color-foreground)',
            }}
            formatter={(value, name) => [
              `${value ?? 0} 本`,
              LABEL_MAP[String(name ?? '')] || String(name ?? ''),
            ]}
            labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }}
          />
          <Legend
            formatter={(value) => LABEL_MAP[String(value)] || String(value)}
            iconType="rect"
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Area
            dataKey="visibleVideos"
            fill="var(--color-success)"
            fillOpacity={0.15}
            stackId="visible"
            stroke="var(--color-success)"
            type="monotone"
          />
          <Area
            dataKey="scheduledVideos"
            fill="var(--color-accent)"
            fillOpacity={0.15}
            stackId="visible"
            stroke="var(--color-accent)"
            type="monotone"
          />
          <Area
            dataKey="hiddenVideos"
            fill="var(--color-warning)"
            fillOpacity={0.15}
            stroke="var(--color-warning)"
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

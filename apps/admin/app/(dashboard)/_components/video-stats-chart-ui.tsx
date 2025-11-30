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
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number, name: string) => [
              `${value} 本`,
              LABEL_MAP[name] || name,
            ]}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Legend
            formatter={(value: string) => LABEL_MAP[value] || value}
            iconType="rect"
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Area
            dataKey="visibleVideos"
            fill="#d1fae5"
            stackId="visible"
            stroke="#10b981"
            type="monotone"
          />
          <Area
            dataKey="scheduledVideos"
            fill="#f3e8ff"
            stackId="visible"
            stroke="#a855f7"
            type="monotone"
          />
          <Area
            dataKey="hiddenVideos"
            fill="#fef3c7"
            stroke="#f59e0b"
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type VideoStatsChartProps = {
  data: Array<{
    date: string
    archivedVideos: number
    scheduledVideos: number
    hiddenVideos: number
    deletedVideos: number
  }>
}

// Label mapping for chart legend and tooltip
const LABEL_MAP: Record<string, string> = {
  archivedVideos: 'アーカイブ',
  hiddenVideos: '非表示',
  scheduledVideos: '配信予定・中',
} as const

export function VideoStatsChartUI({ data }: VideoStatsChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
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
          <Bar dataKey="archivedVideos" fill="#10b981" stackId="visible" />
          <Bar dataKey="scheduledVideos" fill="#a855f7" stackId="visible" />
          <Bar dataKey="hiddenVideos" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

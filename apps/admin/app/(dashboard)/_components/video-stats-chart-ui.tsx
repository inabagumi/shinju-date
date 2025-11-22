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
    visibleVideos: number
    hiddenVideos: number
    deletedVideos: number
  }>
}

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
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                deletedVideos: '削除済み',
                hiddenVideos: '非表示',
                visibleVideos: '公開中',
              }
              return [`${value} 本`, labels[name] || name]
            }}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                deletedVideos: '削除済み',
                hiddenVideos: '非表示',
                visibleVideos: '公開中',
              }
              return labels[value] || value
            }}
            iconType="rect"
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Bar dataKey="visibleVideos" fill="#10b981" stackId="active" />
          <Bar dataKey="hiddenVideos" fill="#f59e0b" stackId="active" />
          <Bar dataKey="deletedVideos" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ClickVolumeChartProps = {
  data: Array<{
    clicks: number
    date: string
  }>
  onDateClick?: (date: string) => void
}

export default function ClickVolumeChart({
  data,
  onDateClick,
}: ClickVolumeChartProps) {
  const handleBarClick = (entry: { date: string }) => {
    if (onDateClick && entry.date) {
      onDateClick(entry.date)
    }
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} onClick={handleBarClick}>
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
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            formatter={(value: number) => [`${value} 回`, 'クリック数']}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Bar
            cursor={onDateClick ? 'pointer' : 'default'}
            dataKey="clicks"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

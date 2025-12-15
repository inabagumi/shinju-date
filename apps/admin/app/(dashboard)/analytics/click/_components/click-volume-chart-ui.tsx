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

interface ClickVolumeChartProps {
  data: Array<{
    clicks: number
    date: string
  }>
  onDateClick?: (date: string) => void
}

export default function ClickVolumeChartUI({
  data,
  onDateClick,
}: ClickVolumeChartProps) {
  const handleBarClick = (data: unknown) => {
    if (
      onDateClick &&
      data &&
      typeof data === 'object' &&
      'activeLabel' in data
    ) {
      const label = (data as { activeLabel?: string }).activeLabel
      if (label) {
        onDateClick(label)
      }
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
            formatter={(value: number | undefined) => [
              `${value ?? 0} 回`,
              'クリック数',
            ]}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Bar
            cursor={onDateClick ? 'pointer' : 'default'}
            dataKey="clicks"
            fill="#d1fae5"
            radius={[4, 4, 0, 0]}
            stroke="#10b981"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

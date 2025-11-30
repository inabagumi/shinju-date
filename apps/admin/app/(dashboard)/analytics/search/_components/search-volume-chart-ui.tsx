'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface SearchVolumeChartProps {
  data: Array<{
    count: number
    date: string
  }>
  onDateClick?: (date: string) => void
}

export default function SearchVolumeChartUI({
  data,
  onDateClick,
}: SearchVolumeChartProps) {
  const handleClick = (data: unknown) => {
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
        <AreaChart data={data} onClick={handleClick}>
          <defs>
            <linearGradient id="colorVolume" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#dbeafe" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#dbeafe" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            formatter={(value: number) => [`${value} 回`, '検索数']}
            labelStyle={{ color: '#374151', fontWeight: 600 }}
          />
          <Area
            cursor={onDateClick ? 'pointer' : 'default'}
            dataKey="count"
            fill="url(#colorVolume)"
            fillOpacity={1}
            stroke="#3b82f6"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

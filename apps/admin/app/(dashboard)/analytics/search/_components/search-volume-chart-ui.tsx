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
import {
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
} from '../../_lib/chart-colors'
import { formatDateLabel } from '../../_lib/format-date'

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
              <stop
                offset="5%"
                stopColor={CHART_COLORS.series}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={CHART_COLORS.series}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis
            axisLine={{ stroke: CHART_COLORS.grid }}
            dataKey="date"
            tick={{ fill: CHART_COLORS.tick, fontSize: 12 }}
            tickFormatter={(value: string) =>
              formatDateLabel(value, { includeYear: false })
            }
            tickLine={{ stroke: CHART_COLORS.grid }}
          />
          <YAxis
            axisLine={{ stroke: CHART_COLORS.grid }}
            tick={{ fill: CHART_COLORS.tick, fontSize: 12 }}
            tickLine={{ stroke: CHART_COLORS.grid }}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
            formatter={(value) => [`${value ?? 0} 回`, '検索数']}
            itemStyle={{ color: CHART_COLORS.foreground }}
            labelFormatter={(label) =>
              typeof label === 'string' ? formatDateLabel(label) : label
            }
            labelStyle={{ color: CHART_COLORS.foreground, fontWeight: 600 }}
          />
          <Area
            cursor={onDateClick ? 'pointer' : 'default'}
            dataKey="count"
            fill="url(#colorVolume)"
            fillOpacity={1}
            stroke={CHART_COLORS.series}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

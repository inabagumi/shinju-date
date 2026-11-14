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
import {
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
} from '../../_lib/chart-colors'
import { formatDateLabel } from '../../_lib/format-date'

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
            cursor={{ fill: CHART_COLORS.cursor }}
            formatter={(value) => [`${value ?? 0} 回`, 'クリック数']}
            itemStyle={{ color: CHART_COLORS.foreground }}
            labelFormatter={(label) =>
              typeof label === 'string' ? formatDateLabel(label) : label
            }
            labelStyle={{ color: CHART_COLORS.foreground, fontWeight: 600 }}
          />
          <Bar
            cursor={onDateClick ? 'pointer' : 'default'}
            dataKey="clicks"
            fill={CHART_COLORS.series}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

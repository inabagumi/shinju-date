import { formatNumber } from '@shinju-date/helpers'

export type TrendIndicatorProps = {
  value: number | null
  label?: string
}

/**
 * TrendIndicator - Displays trend change with color-coded icon and value
 * Shows increase (green, up arrow) or decrease (red, down arrow)
 */
export function TrendIndicator({
  value,
  label = '前日比',
}: TrendIndicatorProps) {
  if (value === null) {
    return <span className="text-caption text-muted">{label}: データなし</span>
  }

  const isPositive = value > 0
  const isNeutral = value === 0

  if (isNeutral) {
    return (
      <span className="flex items-center gap-1 text-caption text-muted">
        <span className="flex size-4 items-center justify-center">−</span>
        <span>
          {label}: {formatNumber(value)}
        </span>
      </span>
    )
  }

  const colorClass = isPositive ? 'text-success' : 'text-danger'

  const arrowIcon = isPositive ? '↑' : '↓'

  return (
    <span className={`flex items-center gap-1 text-caption ${colorClass}`}>
      <span className="flex size-4 items-center justify-center font-bold">
        {arrowIcon}
      </span>
      <span>
        {label}: {isPositive ? '+' : ''}
        {formatNumber(value)}
      </span>
    </span>
  )
}

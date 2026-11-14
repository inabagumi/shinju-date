import { formatNumber } from '@shinju-date/helpers'
import { StatTile, type StatTileTone, twMerge } from '@shinju-date/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface TrendProps {
  change: string
  changeTone: StatTileTone
}

/**
 * 前日比を `StatTile` の `change` と `changeTone` に変換する。
 * 増えたら `positive`、減ったら `negative`、変化なしとデータなしは `neutral`。
 * `invert` を指定すると、増えたときを悪い変化として扱う。
 */
export function getTrendProps(
  value: number | null,
  {
    invert = false,
    label = '前日比',
  }: { invert?: boolean; label?: string } = {},
): TrendProps {
  if (value === null) {
    return { change: `${label}: データなし`, changeTone: 'neutral' }
  }

  if (value === 0) {
    return {
      change: `− ${label}: ${formatNumber(value)}`,
      changeTone: 'neutral',
    }
  }

  const isPositive = value > 0
  const isGood = invert ? !isPositive : isPositive

  return {
    change: `${isPositive ? '↑' : '↓'} ${label}: ${isPositive ? '+' : ''}${formatNumber(value)}`,
    changeTone: isGood ? 'positive' : 'negative',
  }
}

interface StatTileLinkProps {
  className?: string
  dayChange: number | null
  href: string
  label: ReactNode
  value: number
}

/** 一覧などの詳しい画面へ移動できる統計のタイル。前日比を添える */
export function StatTileLink({
  className,
  dayChange,
  href,
  label,
  value,
}: StatTileLinkProps) {
  return (
    <Link
      className={twMerge(
        'group block rounded-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      href={href}
    >
      <StatTile
        className="h-full transition-colors group-hover:bg-muted"
        label={label}
        value={formatNumber(value)}
        {...getTrendProps(dayChange)}
      />
    </Link>
  )
}

import { twMerge } from '@shinju-date/ui'
import type { ChartSeries } from '../_lib/chart-series'

interface ChartLegendContentProps {
  series: ChartSeries[]
}

/**
 * Recharts の `<Legend content={…} />` に渡す凡例の中身。
 * 既定の中身は色を inline style で持つため、セマンティックカラーのクラスで描き直す。
 */
export function ChartLegendContent({ series }: ChartLegendContentProps) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-2.5 pt-5">
      {series.map((item) => (
        <li
          className={twMerge('inline-flex items-center gap-1', item.className)}
          key={item.key}
        >
          <svg aria-hidden="true" className="size-3.5" viewBox="0 0 32 32">
            <path d="M0,2h32v28h-32z" fill="currentColor" />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

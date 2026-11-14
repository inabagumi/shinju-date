import { ChartColumn } from 'lucide-react'

/**
 * Compact placeholder for the 7-day video stats chart when no snapshot has
 * been recorded yet. It explains when the data becomes available instead of
 * leaving a chart-sized blank area.
 */
export function VideoStatsChartEmpty() {
  return (
    <div className="flex items-start gap-3 rounded-container border border-dashed border-border px-4 py-5">
      <ChartColumn aria-hidden="true" className="mt-0.5 size-5 text-muted" />
      <div>
        <p className="text-body leading-normal font-semibold">
          まだ集計されたデータがありません
        </p>
        <p className="text-meta text-muted">
          動画数は毎日0時過ぎに前日分を集計します。集計が済むと、ここに推移が表示されます。
        </p>
      </div>
    </div>
  )
}

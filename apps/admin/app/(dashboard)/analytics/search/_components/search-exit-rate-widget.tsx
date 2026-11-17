import { formatNumber } from '@shinju-date/helpers'
import {
  Badge,
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { TableSkeleton } from '@/components/table-skeleton'
import { getSearchExitRates } from '@/lib/analytics/get-search-quality-metrics'
import { ExportLink } from '../../_components/export-link'
import {
  WidgetHeader,
  WidgetHeaderSkeleton,
} from '../../_components/widget-header'
import { resolvePeriod } from '../../_lib/resolve-period'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { EXIT_RATE_RATINGS, rate } from '../_lib/metric-ratings'
import { MetricLegend } from './metric-legend'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

interface SearchExitRate {
  keyword: string
  exitRate: number
  searchCount: number
}

/**
 * Search Exit Rate Widget Component
 */
function SearchExitRateWidgetComponent({
  exitRates,
  dateRange,
  selectedDate,
}: {
  exitRates: SearchExitRate[]
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  return (
    <div>
      <WidgetHeader
        actions={
          <ExportLink
            dateRange={dateRange}
            selectedDate={selectedDate}
            type="search-exit-rates"
          />
        }
        dateRange={dateRange}
        description="検索結果を一度もクリックせずに離脱した割合をキーワードごとに表示します。離脱率が高いキーワードは、検索結果がユーザーの期待と乖離している可能性があります。"
        selectedDate={selectedDate}
        title="検索からの離脱率"
      />

      {exitRates.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-right">順位</TableHead>
              <TableHead>キーワード</TableHead>
              <TableHead className="text-right">検索回数</TableHead>
              <TableHead className="text-right">離脱率</TableHead>
              <TableHead>評価</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exitRates.map((item, index) => {
              const rating = rate(item.exitRate, EXIT_RATE_RATINGS)

              return (
                <TableRow key={item.keyword}>
                  <TableCell className="text-right text-muted tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell className="min-w-48 wrap-break-word whitespace-normal">
                    {item.keyword}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(item.searchCount)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {item.exitRate.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant={rating.variant}>{rating.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState title="データがありません" />
      )}

      <MetricLegend
        columns={4}
        order="ascending"
        ratings={EXIT_RATE_RATINGS}
        title="評価基準"
        unit="%"
      />
    </div>
  )
}

/**
 * Async server component that fetches and displays search exit rate widget
 */
export async function SearchExitRateWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const { start, end } = resolvePeriod({ dateRange, selectedDate })
  const exitRates = await getSearchExitRates(start, end, 20)

  return (
    <SearchExitRateWidgetComponent
      dateRange={dateRange}
      exitRates={exitRates}
      selectedDate={selectedDate}
    />
  )
}

/** 読み込み中の `SearchExitRateWidget`。見出し、5列の表、4つの評価基準を並べる */
export function SearchExitRateWidgetSkeleton() {
  return (
    <div aria-hidden="true">
      <WidgetHeaderSkeleton actions title="検索からの離脱率" />
      <TableSkeleton
        columns={[
          {
            align: 'end',
            cell: <Skeleton className="h-4 w-5" />,
            className: 'w-16',
            id: 'rank',
          },
          { cell: <Skeleton className="h-4 w-48" />, id: 'keyword' },
          {
            align: 'end',
            cell: <Skeleton className="h-4 w-10" />,
            id: 'count',
          },
          { align: 'end', cell: <Skeleton className="h-4 w-12" />, id: 'rate' },
          { cell: <Skeleton className="h-5 w-12" />, id: 'rating' },
        ]}
        rows={10}
      />
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
        <Skeleton className="col-span-2 h-4 w-16 sm:col-span-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

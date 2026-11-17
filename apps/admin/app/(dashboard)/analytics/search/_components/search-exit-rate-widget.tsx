import {
  Badge,
  type BadgeProps,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { getSearchExitRates } from '@/lib/analytics/get-search-quality-metrics'
import { ExportLink } from '../../_components/export-link'
import { WidgetHeader } from '../../_components/widget-header'
import { resolvePeriod } from '../../_lib/resolve-period'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

interface SearchExitRate {
  keyword: string
  exitRate: number
  searchCount: number
}

/**
 * 離脱率の評価。良し悪しの意味で Badge の色を選ぶ
 */
function getExitRateRating(exitRate: number): {
  label: string
  variant: NonNullable<BadgeProps['variant']>
} {
  if (exitRate >= 70) return { label: '要改善', variant: 'danger' }
  if (exitRate >= 50) return { label: '注意', variant: 'warning' }
  if (exitRate >= 30) return { label: '普通', variant: 'neutral' }
  return { label: '良好', variant: 'success' }
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
              const rating = getExitRateRating(item.exitRate)

              return (
                <TableRow key={item.keyword}>
                  <TableCell className="text-right text-muted tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell className="min-w-48 wrap-break-word whitespace-normal">
                    {item.keyword}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.searchCount.toLocaleString('ja-JP')}
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

      <dl className="mt-4 grid grid-cols-2 gap-x-4 text-caption text-muted sm:grid-cols-4">
        <dt className="col-span-2 font-semibold sm:col-span-4">評価基準</dt>
        <dd>30%未満: 良好</dd>
        <dd>30-49%: 普通</dd>
        <dd>50-69%: 注意</dd>
        <dd>70%以上: 要改善</dd>
      </dl>
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

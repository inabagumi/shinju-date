import { cache } from 'react'
import {
  getPopularKeywords,
  type PopularKeyword,
} from '@/lib/analytics/get-popular-keywords'
import { ExportMenu } from '../../_components/export-menu'
import { RankingTable } from '../../_components/ranking-table'
import { WidgetHeader } from '../../_components/widget-header'
import { formatDateLabel } from '../../_lib/format-date'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Cached function to fetch popular keywords data
 */
const fetchPopularKeywordsData = cache(
  async (
    startDate: string,
    endDate: string,
    selectedDate: string | null,
  ): Promise<PopularKeyword[]> => {
    if (selectedDate) {
      return getPopularKeywords(20, Temporal.PlainDate.from(selectedDate))
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getPopularKeywords(20, start, end)
  },
)

/**
 * Simple Popular Keywords Widget Component for server rendering
 */
function PopularKeywordsWidgetComponent({
  keywords,
  dateRange,
  selectedDate,
}: {
  keywords: PopularKeyword[]
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  return (
    <div>
      <WidgetHeader
        actions={
          <ExportMenu
            dateRange={dateRange}
            selectedDate={selectedDate}
            type="keywords"
          />
        }
        dateRange={dateRange}
        description={
          selectedDate
            ? `${formatDateLabel(selectedDate)}に検索されたキーワードのランキング。同じ日付をもう一度クリックすると期間全体の表示に戻ります。`
            : `${formatDateLabel(dateRange.startDate)}から${formatDateLabel(dateRange.endDate)}の期間で最も検索されたキーワードのランキング。グラフの日付をクリックすると、その日のランキングが表示されます。`
        }
        selectedDate={selectedDate}
        title="人気キーワードランキング"
      />
      <RankingTable
        items={keywords.map((item) => ({
          key: item.keyword,
          label: item.keyword,
          value: item.count,
        }))}
        labelHeading="キーワード"
        valueHeading="検索回数"
      />
    </div>
  )
}

/**
 * Async server component that fetches and displays popular keywords widget
 */
export async function PopularKeywordsWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const popularKeywords = await fetchPopularKeywordsData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <PopularKeywordsWidgetComponent
      dateRange={dateRange}
      keywords={popularKeywords}
      selectedDate={selectedDate}
    />
  )
}

import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getPopularKeywords } from '@/lib/analytics/get-popular-keywords'
import { ExportMenu } from '../../_components/export-menu'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

interface PopularKeyword {
  keyword: string
  count: number
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">
          人気キーワードランキング
          {selectedDate ? (
            <span className="ml-2 text-774-blue-600 text-sm">
              ({selectedDate})
            </span>
          ) : (
            <span className="ml-2 text-green-600 text-sm">
              ({dateRange.startDate}〜{dateRange.endDate})
            </span>
          )}
        </h2>
        <ExportMenu
          dateRange={dateRange}
          selectedDate={selectedDate}
          type="keywords"
        />
      </div>
      <p className="mb-4 text-gray-600 text-sm">
        {selectedDate
          ? `${selectedDate}に検索されたキーワードのランキング。同じ日付をもう一度クリックすると期間全体の表示に戻ります。`
          : `${dateRange.startDate}から${dateRange.endDate}の期間で最も検索されたキーワードのランキング。グラフの日付をクリックすると、その日のランキングが表示されます。`}
      </p>
      {keywords.length > 0 ? (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {keywords.map((item, index) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              key={item.keyword}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-774-blue-100 font-semibold text-774-blue-600 text-sm">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.keyword}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-gray-900">{item.count}</p>
                <p className="text-gray-500 text-xs">回</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">データがありません</p>
      )}
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

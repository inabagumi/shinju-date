import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import { getPopularKeywords } from '@/lib/analytics/get-popular-keywords'
import { getAnalyticsDateParams } from '../../_lib/cached-params'

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

type PopularKeyword = {
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
 * Popular Keywords Widget Component
 */
function PopularKeywordsWidget({ keywords }: { keywords: PopularKeyword[] }) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 font-medium text-lg">人気検索キーワード</h3>
      <div className="space-y-2">
        {keywords.map((keyword, index) => (
          <div
            className="flex items-center justify-between"
            key={keyword.keyword}
          >
            <div className="flex items-center space-x-3">
              <span className="text-gray-500 text-sm">#{index + 1}</span>
              <span className="font-medium">{keyword.keyword}</span>
            </div>
            <span className="text-gray-600 text-sm">
              {keyword.count.toLocaleString()}回
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Async server component that fetches and displays popular keywords widget
 */
export async function PopularKeywordsWidgetServer({ searchParams }: Props) {
  const { dateRange, selectedDate } = getAnalyticsDateParams(searchParams)

  const popularKeywords = await fetchPopularKeywordsData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return <PopularKeywordsWidget keywords={popularKeywords} />
}

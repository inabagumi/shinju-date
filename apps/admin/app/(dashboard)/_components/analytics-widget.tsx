import { formatNumber } from '@shinju-date/helpers'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { getAnalyticsSummary } from '../_lib/get-analytics-summary'

/**
 * AnalyticsWidget - Displays analytics summary with links to detailed pages
 * This is an async Server Component that fetches its own data
 */
export async function AnalyticsWidget() {
  'use cache: private'
  cacheLife('minutes')

  const analytics = await getAnalyticsSummary()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">アナリティクス</h2>
      <div className="grid grid-cols-2 gap-4">
        <Link
          className="rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
          href="/analytics/search"
        >
          <p className="text-gray-600 text-sm">本日の検索数</p>
          <p className="font-bold text-2xl text-blue-600">
            {formatNumber(analytics.recentSearches)}
          </p>
        </Link>
        <Link
          className="rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100"
          href="/analytics/click"
        >
          <p className="text-gray-600 text-sm">本日のクリック数</p>
          <p className="font-bold text-2xl text-green-600">
            {formatNumber(analytics.recentClicks)}
          </p>
        </Link>
        <Link
          className="col-span-2 rounded-lg bg-purple-50 p-4 transition-colors hover:bg-purple-100"
          href="/analytics/search"
        >
          <p className="text-gray-600 text-sm">人気キーワード数</p>
          <p className="font-bold text-2xl text-purple-600">
            {formatNumber(analytics.totalPopularKeywords)}
          </p>
        </Link>
      </div>
    </div>
  )
}

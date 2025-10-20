import { formatNumber } from '@shinju-date/helpers'
import { getSummaryStats } from '../_lib/get-summary-stats'

/**
 * SummaryWidget - Displays summary statistics about videos and terms
 * This is an async Server Component that fetches its own data
 */
export async function SummaryWidget() {
  const stats = await getSummaryStats()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">サマリー</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-gray-600 text-sm">総動画数</p>
          <p className="font-bold text-2xl text-blue-600">
            {formatNumber(stats.totalVideos)}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-gray-600 text-sm">公開中</p>
          <p className="font-bold text-2xl text-green-600">
            {formatNumber(stats.visibleVideos)}
          </p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="text-gray-600 text-sm">非表示</p>
          <p className="font-bold text-2xl text-yellow-600">
            {formatNumber(stats.hiddenVideos)}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <p className="text-gray-600 text-sm">総用語数</p>
          <p className="font-bold text-2xl text-purple-600">
            {formatNumber(stats.totalTerms)}
          </p>
        </div>
      </div>
    </div>
  )
}

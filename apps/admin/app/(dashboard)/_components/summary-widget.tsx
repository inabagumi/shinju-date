import { formatNumber } from '@shinju-date/helpers'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { getSummaryStats } from '../_lib/get-summary-stats'
import { TrendIndicator } from './trend-indicator'

/**
 * SummaryWidget - Displays summary statistics about videos and terms with trend indicators
 * This is an async Server Component that fetches its own data
 */
export async function SummaryWidget() {
  'use cache: private'

  cacheLife('minutes')

  const stats = await getSummaryStats(true)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">サマリー</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Link
          className="rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
          href="/videos?deleted=false"
        >
          <p className="text-gray-600 text-xs">総動画数</p>
          <p className="font-bold text-blue-600 text-xl">
            {formatNumber(stats.totalVideos.current)}
          </p>
          <div className="mt-1">
            <TrendIndicator value={stats.totalVideos.dayChange} />
          </div>
        </Link>
        <Link
          className="rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100"
          href="/videos?deleted=false&visible=true"
        >
          <p className="text-gray-600 text-xs">公開中</p>
          <p className="font-bold text-green-600 text-xl">
            {formatNumber(stats.visibleVideos.current)}
          </p>
          <div className="mt-1">
            <TrendIndicator value={stats.visibleVideos.dayChange} />
          </div>
        </Link>
        <Link
          className="rounded-lg bg-yellow-50 p-4 transition-colors hover:bg-yellow-100"
          href="/videos?deleted=false&visible=false"
        >
          <p className="text-gray-600 text-xs">非表示</p>
          <p className="font-bold text-xl text-yellow-600">
            {formatNumber(stats.hiddenVideos.current)}
          </p>
          <div className="mt-1">
            <TrendIndicator value={stats.hiddenVideos.dayChange} />
          </div>
        </Link>
        <Link
          className="rounded-lg bg-red-50 p-4 transition-colors hover:bg-red-100"
          href="/videos?deleted=true"
        >
          <p className="text-gray-600 text-xs">削除済み</p>
          <p className="font-bold text-red-600 text-xl">
            {formatNumber(stats.deletedVideos.current)}
          </p>
          <div className="mt-1">
            <TrendIndicator value={stats.deletedVideos.dayChange} />
          </div>
        </Link>
        <Link
          className="rounded-lg bg-purple-50 p-4 transition-colors hover:bg-purple-100"
          href="/terms"
        >
          <p className="text-gray-600 text-xs">総用語数</p>
          <p className="font-bold text-purple-600 text-xl">
            {formatNumber(stats.totalTerms.current)}
          </p>
          <div className="mt-1">
            <TrendIndicator value={stats.totalTerms.dayChange} />
          </div>
        </Link>
        <Link
          className="rounded-lg bg-indigo-50 p-4 transition-colors hover:bg-indigo-100"
          href="/talents"
        >
          <p className="text-gray-600 text-xs">総タレント数</p>
          <p className="font-bold text-indigo-600 text-xl">
            {formatNumber(stats.totalTalents.current)}
          </p>
          <div className="mt-1">
            <TrendIndicator value={stats.totalTalents.dayChange} />
          </div>
        </Link>
      </div>
    </div>
  )
}

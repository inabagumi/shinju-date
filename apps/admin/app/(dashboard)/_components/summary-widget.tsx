import { formatNumber } from '@shinju-date/helpers'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { getHistoricalStats } from '../_lib/get-historical-stats'
import { getSummaryStats } from '../_lib/get-summary-stats'
import { TrendIndicator } from './trend-indicator'
import { VideoStatsChartUI } from './video-stats-chart-ui'

/**
 * SummaryWidget - Displays summary statistics about videos and terms with trend indicators
 * This is an async Server Component that fetches its own data
 */
export async function SummaryWidget() {
  'use cache: private'

  cacheLife('minutes')

  const [stats, historicalStats] = await Promise.all([
    getSummaryStats(true),
    getHistoricalStats(7),
  ])

  return (
    <>
      {/* Video Summary Section with Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">動画サマリー</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Link
            className="rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
            href="/videos?deleted=false"
          >
            <p className="text-gray-600 text-sm">総動画数</p>
            <p className="font-bold text-2xl text-blue-600">
              {formatNumber(stats.totalVideos.current)}
            </p>
            <div className="mt-2">
              <TrendIndicator value={stats.totalVideos.dayChange} />
            </div>
          </Link>
          <Link
            className="rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100"
            href="/videos?deleted=false&visible=true"
          >
            <p className="text-gray-600 text-sm">公開中</p>
            <p className="font-bold text-2xl text-green-600">
              {formatNumber(stats.visibleVideos.current)}
            </p>
            <div className="mt-2">
              <TrendIndicator value={stats.visibleVideos.dayChange} />
            </div>
          </Link>
          <Link
            className="rounded-lg bg-yellow-50 p-4 transition-colors hover:bg-yellow-100"
            href="/videos?deleted=false&visible=false"
          >
            <p className="text-gray-600 text-sm">非表示</p>
            <p className="font-bold text-2xl text-yellow-600">
              {formatNumber(stats.hiddenVideos.current)}
            </p>
            <div className="mt-2">
              <TrendIndicator value={stats.hiddenVideos.dayChange} />
            </div>
          </Link>
          <Link
            className="rounded-lg bg-red-50 p-4 transition-colors hover:bg-red-100"
            href="/videos?deleted=true"
          >
            <p className="text-gray-600 text-sm">削除済み</p>
            <p className="font-bold text-2xl text-red-600">
              {formatNumber(stats.deletedVideos.current)}
            </p>
            <div className="mt-2">
              <TrendIndicator value={stats.deletedVideos.dayChange} />
            </div>
          </Link>
        </div>

        {/* 7-Day Video Stats Chart */}
        <div className="mt-6">
          <h3 className="mb-3 font-medium text-gray-700 text-lg">
            動画数推移（7日間）
          </h3>
          {historicalStats.length === 0 ? (
            <div className="flex h-80 items-center justify-center text-gray-500">
              <p>データがありません</p>
            </div>
          ) : (
            <VideoStatsChartUI data={historicalStats} />
          )}
        </div>
      </div>

      {/* Content Summary Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">コンテンツサマリー</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link
            className="rounded-lg bg-purple-50 p-4 transition-colors hover:bg-purple-100"
            href="/terms"
          >
            <p className="text-gray-600 text-sm">総用語数</p>
            <p className="font-bold text-2xl text-purple-600">
              {formatNumber(stats.totalTerms.current)}
            </p>
            <div className="mt-2">
              <TrendIndicator value={stats.totalTerms.dayChange} />
            </div>
          </Link>
          <Link
            className="rounded-lg bg-indigo-50 p-4 transition-colors hover:bg-indigo-100"
            href="/talents"
          >
            <p className="text-gray-600 text-sm">総タレント数</p>
            <p className="font-bold text-2xl text-indigo-600">
              {formatNumber(stats.totalTalents.current)}
            </p>
            <div className="mt-2">
              <TrendIndicator value={stats.totalTalents.dayChange} />
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}

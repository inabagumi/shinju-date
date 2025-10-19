import Image from 'next/image'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase'
import { getPopularVideos } from './_lib/get-popular-videos'
import { getSummaryStats } from './_lib/get-summary-stats'

export default async function DashboardPage() {
  const [stats, popularVideos] = await Promise.all([
    getSummaryStats(),
    getPopularVideos(10),
  ])

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">ダッシュボード</h1>

      {/* Grid layout for widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Summary Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">サマリー</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-gray-600 text-sm">総動画数</p>
              <p className="font-bold text-2xl text-blue-600">
                {stats.totalVideos}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-gray-600 text-sm">公開中</p>
              <p className="font-bold text-2xl text-green-600">
                {stats.visibleVideos}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <p className="text-gray-600 text-sm">非表示</p>
              <p className="font-bold text-2xl text-yellow-600">
                {stats.hiddenVideos}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-gray-600 text-sm">総用語数</p>
              <p className="font-bold text-2xl text-purple-600">
                {stats.totalTerms}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Access Widget */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">クイックアクセス</h2>
          <div className="flex flex-col gap-3">
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="/videos"
            >
              <span className="font-medium">動画を管理する</span>
            </Link>
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="/terms"
            >
              <span className="font-medium">用語集を編集する</span>
            </Link>
            <a
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="https://shinju.date"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="font-medium">公開サイトを確認する</span>
              <span className="ml-1 text-gray-500 text-sm">↗</span>
            </a>
          </div>
        </div>

        {/* Popular Videos Widget - Full width */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-xl">人気動画ランキング</h2>
          {popularVideos.length > 0 ? (
            <div className="space-y-3">
              {popularVideos.map((video, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  key={video.slug}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-600">
                    {index + 1}
                  </div>
                  {video.thumbnail ? (
                    <div className="relative h-16 w-28">
                      <Image
                        alt=""
                        className="rounded object-cover"
                        fill
                        sizes="112px"
                        src={
                          supabaseClient.storage
                            .from('thumbnails')
                            .getPublicUrl(video.thumbnail.path).data.publicUrl
                        }
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-28 rounded bg-gray-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{video.title}</p>
                    <p className="text-gray-500 text-sm">
                      クリック数: {video.clicks}
                    </p>
                  </div>
                  <Link
                    className="shrink-0 rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                    href={`/videos?slug=${video.slug}`}
                  >
                    詳細
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">データがありません</p>
          )}
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { getPopularVideos } from '@/lib/actions/get-popular-videos'
import ClickVolumeChart from './_components/click-volume-chart'
import { getClickVolume } from './_lib/get-click-volume'

export default async function ClickAnalyticsPage() {
  const [popularVideos, clickVolume] = await Promise.all([
    getPopularVideos(20, 7),
    getClickVolume(7),
  ])

  const totalClicks = clickVolume.reduce((sum, day) => sum + day.clicks, 0)

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">クリックアナリティクス</h1>

      {/* Grid layout for widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Click Volume Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-xl">
            クリックボリューム (過去7日間)
          </h2>
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <p className="text-gray-600 text-sm">総クリック数</p>
            <p className="font-bold text-2xl text-green-600">{totalClicks}</p>
          </div>
          <ClickVolumeChart data={clickVolume} />
        </div>

        {/* Popular Videos - Full width */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-xl">
            人気動画ランキング (過去7日間)
          </h2>
          <p className="mb-4 text-gray-600 text-sm">
            最もクリックされている動画のランキング。ユーザーの興味を把握できます。
          </p>
          {popularVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {popularVideos.map((item, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  key={item.slug}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600 text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <Link
                      className="font-medium hover:underline"
                      href={`/videos?slug=${item.slug}`}
                    >
                      {item.title}
                    </Link>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-gray-900">{item.clicks}</p>
                    <p className="text-gray-500 text-xs">回</p>
                  </div>
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

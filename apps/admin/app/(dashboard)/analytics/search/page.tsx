import SearchVolumeChart from './_components/search-volume-chart'
import { getPopularKeywords } from './_lib/get-popular-keywords'
import { getSearchVolume } from './_lib/get-search-volume'
import { getZeroResultKeywords } from './_lib/get-zero-result-keywords'

export default async function SearchAnalyticsPage() {
  const [popularKeywords, zeroResultKeywords, searchVolume] = await Promise.all(
    [getPopularKeywords(20), getZeroResultKeywords(), getSearchVolume(7)],
  )

  const totalSearches = searchVolume.reduce((sum, day) => sum + day.count, 0)

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">検索アナリティクス</h1>

      {/* Grid layout for widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Search Volume Summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-xl">
            検索ボリューム (過去7日間)
          </h2>
          <div className="mb-4 rounded-lg bg-blue-50 p-4">
            <p className="text-gray-600 text-sm">総検索数</p>
            <p className="font-bold text-2xl text-blue-600">{totalSearches}</p>
          </div>
          <SearchVolumeChart data={searchVolume} />
        </div>

        {/* Zero Results Keywords */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">
            検索結果ゼロのキーワード
          </h2>
          <p className="mb-4 text-gray-600 text-sm">
            ユーザーが検索したものの結果が見つからなかったキーワード。コンテンツギャップを特定する機会です。
          </p>
          {zeroResultKeywords.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {zeroResultKeywords.map((keyword) => (
                <div
                  className="rounded border border-gray-200 bg-gray-50 px-3 py-2"
                  key={keyword}
                >
                  <code className="text-sm">{keyword}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">データがありません</p>
          )}
        </div>

        {/* Popular Keywords - Full width */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">
            人気キーワードランキング
          </h2>
          <p className="mb-4 text-gray-600 text-sm">
            最も検索されているキーワードのランキング。ユーザーの関心を把握できます。
          </p>
          {popularKeywords.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {popularKeywords.map((item, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  key={item.keyword}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600 text-sm">
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
      </div>
    </div>
  )
}

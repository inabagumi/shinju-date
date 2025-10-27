import { cache } from 'react'
import { getZeroResultKeywords } from '../_lib/get-zero-result-keywords'

/**
 * Cached function to fetch zero result keywords data
 */
const fetchZeroResultKeywordsData = cache(async () => {
  return getZeroResultKeywords()
})

/**
 * Zero Result Keywords Widget Component
 */
function ZeroResultKeywordsWidgetComponent({
  keywords,
}: {
  keywords: string[]
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">検索結果ゼロのキーワード</h2>
      </div>
      <p className="mb-4 text-gray-600 text-sm">
        ユーザーが検索したものの結果が見つからなかったキーワード。コンテンツギャップを特定する機会です。
      </p>
      {keywords.length > 0 ? (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {keywords.map((keyword) => (
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
  )
}

/**
 * Async server component that fetches and displays zero result keywords widget
 */
export async function ZeroResultKeywordsWidget() {
  const zeroResultKeywords = await fetchZeroResultKeywordsData()

  return <ZeroResultKeywordsWidgetComponent keywords={zeroResultKeywords} />
}

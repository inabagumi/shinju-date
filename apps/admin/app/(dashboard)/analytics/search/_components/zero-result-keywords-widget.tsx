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
      <div className="space-y-2">
        {keywords.length === 0 ? (
          <p className="text-gray-500 text-sm">
            該当するキーワードはありません
          </p>
        ) : (
          keywords.map((keyword, index) => (
            <div className="flex items-center space-x-3" key={keyword}>
              <span className="text-gray-500 text-sm">#{index + 1}</span>
              <span className="font-medium">{keyword}</span>
            </div>
          ))
        )}
      </div>
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

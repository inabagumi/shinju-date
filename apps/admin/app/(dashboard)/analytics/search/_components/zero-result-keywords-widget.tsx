import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import { cache } from 'react'
import { WidgetHeader } from '../../_components/widget-header'
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
      <WidgetHeader
        description="ユーザーが検索したものの結果が見つからなかったキーワード。コンテンツギャップを特定する機会です。"
        title="検索結果ゼロのキーワード"
      />
      {keywords.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>キーワード</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.map((keyword) => (
              <TableRow key={keyword}>
                <TableCell className="wrap-break-word whitespace-normal">
                  <code>{keyword}</code>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState title="データがありません" />
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

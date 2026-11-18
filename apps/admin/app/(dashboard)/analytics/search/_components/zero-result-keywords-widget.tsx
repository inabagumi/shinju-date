import {
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shinju-date/ui";

import { TableSkeleton } from "@/components/table-skeleton";
import { getZeroResultKeywords } from "@/lib/analytics/get-zero-result-keywords";

import {
  WidgetHeader,
  WidgetHeaderSkeleton,
} from "../../_components/widget-header";

/**
 * Zero Result Keywords Widget Component
 */
function ZeroResultKeywordsWidgetComponent({
  keywords,
}: {
  keywords: string[];
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
  );
}

/**
 * Async server component that fetches and displays zero result keywords widget
 */
export async function ZeroResultKeywordsWidget() {
  const zeroResultKeywords = await getZeroResultKeywords();

  return <ZeroResultKeywordsWidgetComponent keywords={zeroResultKeywords} />;
}

/** 読み込み中の `ZeroResultKeywordsWidget`。見出しと、1列の表を並べる */
export function ZeroResultKeywordsWidgetSkeleton() {
  return (
    <div aria-hidden="true">
      <WidgetHeaderSkeleton period={false} title="検索結果ゼロのキーワード" />
      <TableSkeleton
        columns={[{ cell: <Skeleton className="h-4 w-40" />, id: "keyword" }]}
        rows={10}
      />
    </div>
  );
}

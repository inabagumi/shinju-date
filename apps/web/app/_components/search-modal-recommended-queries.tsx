import RecommendedQueries from "@/components/recommended-queries";
import { TOTAL_DISPLAY_COUNT } from "@/lib/recommendations/constants";

import { SearchModalSectionHeading } from "./search-modal-section-heading";

interface SearchModalRecommendedQueriesProps {
  onClickLink?: () => void;
  /** `null` while loading, otherwise the fetched queries */
  queries: string[] | null;
  /** リンク先に引き継ぐタレントの ID */
  talentIds?: readonly string[];
}

function RecommendedQueriesHeading() {
  return (
    <SearchModalSectionHeading>
      おすすめの検索キーワード
    </SearchModalSectionHeading>
  );
}

function RecommendedQueriesSkeleton() {
  return (
    <div aria-busy="true" className="p-2">
      <span className="sr-only">読み込み中...</span>
      {/* 読み込み後に高さが変わらないよう、表示するクエリと同じ件数にする */}
      {Array.from({ length: TOTAL_DISPLAY_COUNT }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 件数が決まっていて並びも変わらないスケルトンなので、インデックスをキーにする
        <div className="flex w-full items-center gap-3 px-4 py-3" key={index}>
          <span className="size-4 shrink-0 animate-pulse rounded-control bg-muted" />
          <span className="h-6 w-40 animate-pulse rounded-control bg-muted" />
        </div>
      ))}
    </div>
  );
}

/**
 * Recommended queries section for the search modal.
 *
 * - Shows the heading with skeleton rows while loading
 * - Renders nothing (including the heading) when there are no queries
 */
export function SearchModalRecommendedQueries({
  onClickLink,
  queries,
  talentIds = [],
}: SearchModalRecommendedQueriesProps) {
  if (queries === null) {
    return (
      <div>
        <RecommendedQueriesHeading />
        <RecommendedQueriesSkeleton />
      </div>
    );
  }

  if (queries.length === 0) {
    return null;
  }

  return (
    <div>
      <RecommendedQueriesHeading />
      <RecommendedQueries
        queries={queries}
        talentIds={talentIds}
        variant="list"
        {...(onClickLink ? { onClickLink } : {})}
      />
    </div>
  );
}

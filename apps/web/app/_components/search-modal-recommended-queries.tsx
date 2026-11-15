import RecommendedQueries from '@/components/recommended-queries'
import { SearchModalSectionHeading } from './search-modal-section-heading'

/**
 * Number of skeleton rows shown while recommended queries are loading.
 * Matches the number of queries returned by `getDisplayRecommendationQueries`
 * so the modal height does not change once loading completes.
 */
const SKELETON_COUNT = 4

interface SearchModalRecommendedQueriesProps {
  onClickLink?: () => void
  /** `null` while loading, otherwise the fetched queries */
  queries: string[] | null
  /** リンク先に引き継ぐタレントの ID */
  talentIds?: readonly string[]
}

function RecommendedQueriesHeading() {
  return (
    <SearchModalSectionHeading>
      おすすめの検索キーワード
    </SearchModalSectionHeading>
  )
}

function RecommendedQueriesSkeleton() {
  return (
    <div aria-busy="true" className="p-2">
      <span className="sr-only">読み込み中...</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div className="flex w-full items-center gap-3 px-4 py-3" key={index}>
          <span className="size-4 shrink-0 animate-pulse rounded-control bg-muted" />
          <span className="h-6 w-40 animate-pulse rounded-control bg-muted" />
        </div>
      ))}
    </div>
  )
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
    )
  }

  if (queries.length === 0) {
    return null
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
  )
}

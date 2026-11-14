import RecommendedQueries from '@/components/recommended-queries'

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
}

function RecommendedQueriesHeading() {
  return (
    <div className="border-b border-774-nevy-200 px-4 py-3 dark:border-zinc-700">
      <h2 className="text-sm text-774-nevy-500 dark:text-774-nevy-400">
        おすすめの検索キーワード
      </h2>
    </div>
  )
}

function RecommendedQueriesSkeleton() {
  return (
    <div aria-busy="true" className="p-2">
      <span className="sr-only">読み込み中...</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div className="flex w-full items-center gap-3 px-4 py-3" key={index}>
          <span className="size-4 shrink-0 animate-pulse rounded bg-774-nevy-100 dark:bg-zinc-800" />
          <span className="h-6 w-40 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
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
        variant="list"
        {...(onClickLink ? { onClickLink } : {})}
      />
    </div>
  )
}

import Link from 'next/link'

interface RecommendedQueriesProps {
  queries: string[]
  variant?: 'default' | 'compact'
}

/**
 * Display recommended search keywords as clickable links
 *
 * @param queries - Array of recommended search query strings
 * @param variant - Display variant: 'default' for normal spacing, 'compact' for tighter spacing
 */
export default function RecommendedQueries({
  queries,
  variant = 'default',
}: RecommendedQueriesProps) {
  if (queries.length === 0) {
    return null
  }

  const gridClasses =
    variant === 'compact' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'

  return (
    <nav aria-label="おすすめの検索キーワード">
      <ul className={`grid gap-2 ${gridClasses}`}>
        {queries.map((query) => (
          <li key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className="block rounded-xl px-1 py-2 text-center hover:bg-774-nevy-100 dark:hover:bg-zinc-600"
              href={`/videos/${encodeURIComponent(query)}`}
              title={`『${query}』の検索結果`}
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

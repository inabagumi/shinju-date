import { Hash } from 'lucide-react'
import Link from 'next/link'

interface RecommendedQueriesProps {
  onClickLink?: () => void
  queries: string[]
  variant?: 'default' | 'list'
}

/**
 * Display recommended search keywords as clickable links
 *
 * @param queries - Array of recommended search query strings
 * @param variant - Display variant: 'default' for wrapping pills, 'list' for vertical list with icons
 * @param onClickLink - Optional callback when a link is clicked
 */
export default function RecommendedQueries({
  onClickLink,
  queries,
  variant = 'default',
}: RecommendedQueriesProps) {
  if (queries.length === 0) {
    return null
  }

  // List variant: similar to search suggestions
  if (variant === 'list') {
    return (
      <nav aria-label="おすすめの検索キーワード">
        <div className="max-h-96 overflow-y-auto">
          <div className="p-2">
            {queries.map((query) => (
              <Link
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-774-nevy-100 dark:hover:bg-zinc-800"
                href={`/videos/${encodeURIComponent(query)}`}
                key={query}
                {...(onClickLink ? { onClick: onClickLink } : {})}
              >
                <Hash className="size-4 text-774-nevy-400 dark:text-774-nevy-300" />
                <span className="text-primary dark:text-774-nevy-50">
                  {query}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    )
  }

  // Default variant: pills that wrap onto the next line
  return (
    <nav aria-label="おすすめの検索キーワード">
      <ul className="flex flex-wrap justify-center gap-2">
        {queries.map((query) => (
          <li key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className="inline-flex h-9 items-center rounded-full border border-border px-4 text-meta text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={`/videos/${encodeURIComponent(query)}`}
              title={`『${query}』の検索結果`}
              {...(onClickLink ? { onClick: onClickLink } : {})}
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

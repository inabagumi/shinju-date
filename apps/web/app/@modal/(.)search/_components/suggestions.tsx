import { logger } from '@shinju-date/logger'
import { Search } from 'lucide-react'
import type * as z from 'zod'
import { supabaseClient } from '@/lib/supabase'
import type { searchParamsSchema } from '../_lib/search-params-schema'
import { SearchModalLink } from './search-modal'

async function fetchSuggestions(query: string) {
  if (!query) {
    return []
  }

  const { data, error } = await supabaseClient.rpc('suggestions_v2', {
    p_query: query,
  })

  if (error) {
    logger.error('Failed to fetch suggestions', { error, query })

    return []
  }

  return data
}

export async function Suggestions({
  searchParams,
}: {
  searchParams: Promise<z.Infer<typeof searchParamsSchema>>
}) {
  const { q: query = '' } = await searchParams
  const suggestions = await fetchSuggestions(query)

  return (
    <div>
      {suggestions.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          <div className="p-2">
            {suggestions.map((suggestion: { term: string }) => (
              <SearchModalLink
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-774-nevy-100 dark:hover:bg-zinc-800"
                data-suggestion-link
                href={`/videos/${encodeURIComponent(suggestion.term)}`}
                key={suggestion.term}
              >
                <Search className="size-4 text-774-nevy-400 dark:text-774-nevy-300" />
                <span className="text-primary dark:text-774-nevy-50">
                  {suggestion.term}
                </span>
              </SearchModalLink>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-774-nevy-400 text-sm dark:text-774-nevy-400">
          {query
            ? `Enterキーを押して「${query}」を検索`
            : '動画のタイトルやタレント名で検索できます'}
        </div>
      )}
    </div>
  )
}

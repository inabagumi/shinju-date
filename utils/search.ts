import algoliasearch from 'algoliasearch/lite'
import type { SearchOptions, SearchResponse } from '@algolia/client-search'

const search = async <T = unknown>(
  query: string,
  options?: SearchOptions
): Promise<SearchResponse<T>> => {
  const client = algoliasearch(
    process.env.ALGOLIA_APPLICATION_ID,
    process.env.ALGOLIA_API_KEY
  )
  const index = client.initIndex(process.env.ALGOLIA_INDEX_NAME)

  return index.search<T>(query, options)
}

export default search

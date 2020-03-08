import { ObjectWithObjectID, SearchOptions } from '@algolia/client-search'
import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch/lite'
import { useContext } from 'react'
import useSWR, { responseInterface } from 'swr'
import Context from './context'

export function useAlgoliaClient(): SearchClient {
  const { applicationId, apiKey } = useContext(Context)

  if (!applicationId) throw new TypeError('Application ID is required.')
  if (!apiKey) throw new TypeError('API key is required.')

  return algoliasearch(applicationId, apiKey)
}

export function useSearchIndex(): SearchIndex {
  const client = useAlgoliaClient()
  const { indexName } = useContext(Context)

  if (!indexName) throw new TypeError('Index name is required.')

  return client.initIndex(indexName)
}

const QUERY_FROM_PREFIX = 'from:'

type ParsedQuery = {
  filters: string
  keywords: string[]
}

const parseQuery = (query: string): ParsedQuery => {
  const keywords: string[] = []
  const channels: string[] = []

  query.split(/\s+/).forEach(keyword => {
    if (
      keyword.startsWith(QUERY_FROM_PREFIX) &&
      keyword.length > QUERY_FROM_PREFIX.length
    ) {
      channels.push(keyword.slice(QUERY_FROM_PREFIX.length))
    } else {
      keywords.push(keyword)
    }
  })

  return {
    keywords,
    filters: channels
      .map((channel): string => `channel.id:"${channel}"`)
      .join(' ')
  }
}

export function useSearch<T = unknown, Error = unknown>(
  query: string,
  params: SearchOptions
): responseInterface<(T & ObjectWithObjectID)[], Error> {
  const index = useSearchIndex()
  const response = useSWR<(T & ObjectWithObjectID)[], Error>(
    `/api/search?q=${query}&page=${params.page ?? 0}`,
    async (): Promise<(T & ObjectWithObjectID)[]> => {
      const { keywords, filters } = parseQuery(query)
      const { hits } = await index.search<T>(keywords.join(' '), {
        filters,
        hitsPerPage: 9,
        ...params
      })

      return hits as (T & ObjectWithObjectID)[]
    }
  )

  return response
}

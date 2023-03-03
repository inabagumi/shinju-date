import { createNullCache } from '@algolia/cache-common'
import { createFetchRequester } from '@algolia/requester-fetch'
import algoliasearch, {
  type SearchClient,
  type SearchIndex
} from 'algoliasearch/lite'

export type SearchOptions = {
  filters?: string[]
  limit?: number
  page?: number
  query?: string
}

let client: SearchClient

export function getClient(): SearchClient {
  client ??= algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
    process.env.NEXT_PUBLIC_ALGOLIA_API_KEY,
    {
      requester: createFetchRequester({
        requesterOptions: {
          next: {
            revalidate: 60
          }
        }
      }),
      requestsCache: createNullCache(),
      responsesCache: createNullCache()
    }
  )

  return client
}

export function getDefaultIndex(): SearchIndex {
  const client = getClient()

  return client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME)
}

export * from './videos'

import { createNullCache } from '@algolia/cache-common'
import { createFetchRequester } from '@algolia/requester-fetch'
import algoliasearch, { type SearchIndex } from 'algoliasearch'

type CreateAlgoliaClientOptions = {
  apiKey?: string
  appID?: string
  index?: string
}

export function createAlgoliaClient({
  apiKey = process.env.NEXT_PUBLIC_ALGOLIA_API_KEY,
  appID = process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
  index = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME
}: CreateAlgoliaClientOptions = {}): SearchIndex {
  if (!appID || !apiKey) {
    throw new TypeError('Application ID or API Key is undefined.')
  }

  if (!index) {
    throw new TypeError('Index is undefined.')
  }

  const client = algoliasearch(appID, apiKey, {
    requester: createFetchRequester({
      requesterOptions: {
        next: {
          revalidate: 60
        }
      }
    }),
    requestsCache: createNullCache(),
    responsesCache: createNullCache()
  })

  return client.initIndex(index)
}

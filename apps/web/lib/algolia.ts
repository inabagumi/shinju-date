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

export type Image = {
  height: number
  preSrc: string
  src: string
  width: number
}

export type Channel = {
  id: string
  title: string
  slug: string
  url: string
}

export type Video = {
  channel: Channel
  duration?: string
  id: string
  publishedAt: number
  thumbnail?: Image
  title: string
  url: string
}

type GetVideosOptions = SearchOptions & {
  channelIDs?: string[]
}

export function getVideos({
  channelIDs,
  filters = [],
  ...options
}: GetVideosOptions = {}): Promise<Video[]> {
  return getVideosByQuery({
    filters: [
      channelIDs &&
        channelIDs.map((channelID) => `channel.id:${channelID}`).join(' OR '),
      ...filters
    ].filter(Boolean) as string[],
    ...options
  })
}

export async function getVideosByQuery({
  filters = [],
  limit = 20,
  page = 1,
  query = ''
}: SearchOptions = {}): Promise<Video[]> {
  const index = getDefaultIndex()
  const { hits } = await index.search<Video>(query, {
    filters: filters.join(' AND '),
    hitsPerPage: limit,
    page: page - 1
  })

  return hits
}

import algoliasearch from 'algoliasearch/lite'
import type { SearchClient, SearchIndex } from 'algoliasearch/lite'

export type SearchOptions = {
  filters?: string[]
  limit?: number
  page?: number
  query?: string
}

export type Image = {
  height: number
  preSrc: string
  src: string
  width: number
}

export type Group = {
  id: string
  title: string
}

export type Channel = {
  id: string
  title: string
  url: string
}

export type ChannelWithGroup = Channel & {
  group: Group
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

export async function getChannelByID(id: string) {
  const videos = await getVideosByChannelID(id, {
    limit: 1
  })

  if (videos.length < 1) {
    throw new TypeError('That channel does not exist.')
  }

  return videos[0].channel
}

export async function getChannelsByGroupID(
  id: string,
  { filters = [], limit = 100, page = 1 }: SearchOptions = {}
): Promise<ChannelWithGroup[]> {
  const index = getChannelsIndex()
  const { hits } = await index.search<ChannelWithGroup>('', {
    filters: [`group.id:${id}`, ...filters].join(' AND '),
    hitsPerPage: limit,
    page: page - 1
  })

  return hits
}

export function getChannelsIndex(): SearchIndex {
  const client = getClient()

  return client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_CHANNELS_INDEX_NAME)
}

let client: SearchClient

export function getClient(): SearchClient {
  client ??= algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID,
    process.env.NEXT_PUBLIC_ALGOLIA_API_KEY
  )

  return client
}

export function getDefaultIndex(): SearchIndex {
  const client = getClient()

  return client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME)
}

export async function getGroupByID(id: string) {
  const channels = await getChannelsByGroupID(id, {
    limit: 1
  })

  if (channels.length < 1) {
    throw new TypeError('That group does not exist.')
  }

  return channels[0].group
}

export function getVideosByChannelIDs(
  channelIDs: string[],
  { filters = [], ...options }: SearchOptions = {}
): Promise<Video[]> {
  return getVideosByQuery({
    filters: [
      channelIDs.map((channelID) => `channel.id:${channelID}`).join(' OR '),
      ...filters
    ].filter(Boolean),
    ...options
  })
}

export function getVideosByChannelID(
  id: string,
  options: SearchOptions = {}
): Promise<Video[]> {
  return getVideosByChannelIDs([id], options)
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

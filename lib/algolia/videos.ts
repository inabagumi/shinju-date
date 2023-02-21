import { cache } from 'react'
import { type SearchOptions, getDefaultIndex } from '.'

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

export async function getChannelByID(id: string) {
  const videos = await getVideosByChannelID(id, {
    limit: 1
  })

  if (videos.length < 1) {
    throw new TypeError('That channel does not exist.')
  }

  return videos[0].channel
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

export const getVideosByQuery = cache(async function getVideosByQuery({
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
})

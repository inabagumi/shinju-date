import { Temporal } from '@js-temporal/polyfill'
import { type DefaultDatabase } from '@shinju-date/supabase'
import { type Fetcher } from 'swr'
import { type SWRInfiniteFetcher } from 'swr/infinite'
import { timeZone } from '@/lib/constants'
import { supabaseClient } from '@/lib/supabase'

export const SEARCH_RESULT_COUNT = 9

export const DEFAULT_SEARCH_SELECT = `
  channels!inner (name, slug),
  duration,
  slug,
  thumbnails (blur_data_url, height, path, width),
  published_at,
  title,
  url
`

export type Channel = Pick<
  DefaultDatabase['public']['Tables']['channels']['Row'],
  'name' | 'slug'
>

export type Thumbnail = Pick<
  DefaultDatabase['public']['Tables']['thumbnails']['Row'],
  'blur_data_url' | 'height' | 'path' | 'width'
>

export type Video = Pick<
  DefaultDatabase['public']['Tables']['videos']['Row'],
  'duration' | 'slug' | 'published_at' | 'title' | 'url'
> & {
  channels: Channel[] | Channel | null
  thumbnails?: Thumbnail[] | Thumbnail | null
}

type FetchNotEndedVideosOptions = {
  channelIDs?: string[]
}

export const fetchNotEndedVideos: Fetcher<
  Video[],
  FetchNotEndedVideosOptions
> = async ({ channelIDs }) => {
  const baseTime = Temporal.Now.instant()
  const hour = baseTime.toZonedDateTimeISO(timeZone).with({
    microsecond: 0,
    millisecond: 0,
    minute: 0,
    nanosecond: 0,
    second: 0
  }) // startOfHour
  const since = hour.toInstant().subtract({ hours: 5 })
  const until = hour.add({ weeks: 1 }).toInstant()

  let builder = supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .gte('published_at', since.toJSON())
    .lte('published_at', until.toJSON())
    .order('published_at', { ascending: false })
    .limit(100)

  if (channelIDs && channelIDs.length > 0) {
    builder = builder.in('channels.slug', channelIDs)
  }

  const { data: videos, error } = await builder

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  return videos.filter((video) => {
    const publishedAt = Temporal.Instant.from(video.published_at)
    const duration = Temporal.Duration.from(video.duration)
    const endedAt = publishedAt.add(duration)

    return (
      Temporal.Instant.compare(endedAt, baseTime) >= 0 ||
      duration.total({ unit: 'second' }) < 1
    )
  })
}

type FetchVideosByChannelIDsOptions = {
  channelIDs?: string[]
  page?: number
  query?: string
}

type KeyLoader = (
  index: number,
  previousPageData: Video[]
) => FetchVideosByChannelIDsOptions

export const fetchVideosByChannelIDs: SWRInfiniteFetcher<
  Video[],
  KeyLoader
> = async ({ channelIDs, page = 1, query = '' }) => {
  const until = Temporal.Now.zonedDateTimeISO(timeZone)
    .startOfDay()
    .add({ months: 1 })
    .toInstant()

  const from = SEARCH_RESULT_COUNT * (page - 1)

  if (query) {
    let builder = supabaseClient
      .rpc('search_videos', { query })
      .lte('published_at', until.toJSON())
      .order('published_at', { ascending: false })
      .range(from, from + SEARCH_RESULT_COUNT - 1)

    if (channelIDs && channelIDs.length > 0) {
      builder = builder.in('channels.slug', channelIDs)
    }

    const { data: videos, error } = await builder.select(DEFAULT_SEARCH_SELECT)

    if (error) {
      throw new TypeError(error.message, { cause: error })
    }

    return videos
  }

  let builder = supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .lte('published_at', until.toJSON())
    .order('published_at', { ascending: false })
    .range(from, from + SEARCH_RESULT_COUNT - 1)

  if (channelIDs && channelIDs.length > 0) {
    builder = builder.in('channels.slug', channelIDs)
  }

  const { data: videos, error } = await builder

  if (error) {
    throw new TypeError(error.message, { cause: error })
  }

  return videos
}

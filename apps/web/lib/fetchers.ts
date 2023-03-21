import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { type Fetcher } from 'swr'
import { type SWRInfiniteFetcher } from 'swr/infinite'
import { getVideos } from '@/lib/algolia'
import { supabase } from '@/lib/supabase'

export const SEARCH_RESULT_COUNT = 9
export const DEFAULT_SEARCH_SELECT = `
  channels!inner (name, slug),
  duration,
  slug,
  thumbnails!inner (blur_data_url, height, path, width),
  published_at,
  title,
  url
`

export type Channel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'name' | 'slug'
>

export type Thumbnail = Pick<
  Database['public']['Tables']['thumbnails']['Row'],
  'blur_data_url' | 'height' | 'path' | 'width'
>

export type Video = Pick<
  Database['public']['Tables']['videos']['Row'],
  'duration' | 'slug' | 'published_at' | 'title' | 'url'
> & {
  channels: Channel[] | Channel | null
  thumbnails: Thumbnail[] | Thumbnail | null
}

type FetchNotEndedVideosOptions = {
  channelIDs?: string[]
}

export const fetchNotEndedVideos: Fetcher<
  Video[],
  FetchNotEndedVideosOptions
> = async ({ channelIDs }) => {
  const baseTime = Temporal.Now.instant()
  const since = baseTime.subtract({ hours: 5 })
  const until = baseTime
    .toZonedDateTimeISO('UTC')
    .add({ months: 2 })
    .toInstant()

  let builder = supabase
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .is('deleted_at', null)
    .is('channels.deleted_at', null)
    .gte('published_at', since.toJSON())
    .lte('published_at', until.toJSON())
    .order('published_at', { ascending: false })
    .limit(100)

  if (channelIDs) {
    builder = builder.in('channels.slug', channelIDs)
  }

  const { data: videos, error } = await builder

  if (error) {
    throw error
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
  const baseTime = Temporal.Now.instant()
  const until = baseTime
    .toZonedDateTimeISO('UTC')
    .add({ months: 2 })
    .toInstant()

  if (!query) {
    const from = SEARCH_RESULT_COUNT * (page - 1)
    let builder = supabase
      .from('videos')
      .select(DEFAULT_SEARCH_SELECT)
      .is('deleted_at', null)
      .is('channels.deleted_at', null)
      .lte('published_at', until.toJSON())
      .order('published_at', { ascending: false })
      .range(from, from + SEARCH_RESULT_COUNT - 1)

    if (channelIDs) {
      builder = builder.in('channels.slug', channelIDs)
    }

    const { data: videos, error } = await builder

    if (error) {
      throw error
    }

    return videos
  }

  const videos = await getVideos({
    channelIDs,
    filters: [`publishedAt <= ${until.epochSeconds}`],
    limit: SEARCH_RESULT_COUNT,
    page,
    query
  })

  const { data, error } = await supabase
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .is('deleted_at', null)
    .is('channels.deleted_at', null)
    .in(
      'slug',
      videos.map((video) => video.id)
    )
    .order('published_at', { ascending: false })
    .limit(SEARCH_RESULT_COUNT)

  if (error) {
    throw error
  }

  return data
}

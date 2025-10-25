'use server'

import type { Tables } from '@shinju-date/database'
import { startOfHour } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getCurrentTime } from '@/lib/cached-functions'
import { SEARCH_RESULT_COUNT, timeZone } from '@/lib/constants'
import { supabaseClient } from '@/lib/supabase'

const DEFAULT_SEARCH_SELECT = `
  channel:channels!inner (name, slug),
  duration,
  slug,
  thumbnail:thumbnails (blur_data_url, height, path, width),
  published_at,
  title
`

export type Channel = Pick<Tables<'channels'>, 'name' | 'slug'>

export type Thumbnail = Pick<
  Tables<'thumbnails'>,
  'blur_data_url' | 'height' | 'path' | 'width'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'slug' | 'published_at' | 'title'
> & {
  channel: Channel
  thumbnail?: Thumbnail | null
}

type FetchNotEndedVideosOptions = {
  channelIDs?: string[] | undefined
}

export const fetchNotEndedVideos = async ({
  channelIDs = [],
}: FetchNotEndedVideosOptions): Promise<Video[]> => {
  const epochNanoseconds = await getCurrentTime()
  const baseTime = Temporal.Instant.fromEpochNanoseconds(epochNanoseconds)
  const hour = startOfHour(baseTime.toZonedDateTimeISO(timeZone))
  const since = hour.toInstant().subtract({
    hours: 5,
  })
  const until = hour
    .add({
      weeks: 1,
    })
    .toInstant()

  let builder = supabaseClient
    .from('videos')
    .select(DEFAULT_SEARCH_SELECT)
    .gte('published_at', since.toJSON())
    .lte('published_at', until.toJSON())
    .order('published_at', {
      ascending: false,
    })
    .limit(100)

  if (channelIDs && channelIDs.length > 0) {
    builder = builder.in('channels.slug', channelIDs)
  }

  const { data: videos, error } = await builder

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos.filter((video) => {
    const publishedAt = Temporal.Instant.from(video.published_at)
    const duration = Temporal.Duration.from(video.duration)
    const endedAt =
      duration.total({
        unit: 'second',
      }) > 0
        ? publishedAt.add(duration)
        : undefined

    // 終了時刻がわかっている動画
    if (endedAt) {
      // プレミア公開中の動画
      return Temporal.Instant.compare(endedAt, baseTime) >= 0
    }

    // (おそらく) ライブ配信中の動画
    if ((publishedAt.epochMilliseconds / 1_000) % 60 > 0) {
      return true
    }

    // まだ配信開始前やプレミア公開開始前の動画 (30分のゆとりあり)
    return (
      Temporal.Instant.compare(
        baseTime.subtract({
          minutes: 30,
        }),
        publishedAt,
      ) < 0
    )
  })
}

async function getDefaultBaseTime() {
  const epochNanoseconds = await getCurrentTime()

  return Temporal.Instant.fromEpochNanoseconds(epochNanoseconds)
    .toZonedDateTimeISO(timeZone)
    .startOfDay()
    .add({
      months: 1,
    })
    .toInstant()
}

type FetchVideosByChannelIDsOptions = {
  channelIDs?: number[] | undefined
  query?: string
  until?: bigint | undefined
}

export const fetchVideosByChannelIDs = async ({
  channelIDs = [],
  query = '',
  until,
}: FetchVideosByChannelIDsOptions): Promise<Video[]> => {
  const baseTime = until
    ? Temporal.Instant.fromEpochNanoseconds(until)
    : await getDefaultBaseTime()
  const { data: videos, error } = await supabaseClient
    .rpc('search_videos_v2', {
      channel_ids: channelIDs ?? [],
      perpage: SEARCH_RESULT_COUNT,
      query,
      until: baseTime.toJSON(),
    })
    .select<string, Video>(DEFAULT_SEARCH_SELECT)

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videos
}

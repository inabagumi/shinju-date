import { type Fetcher } from 'swr'
import { type SWRInfiniteFetcher } from 'swr/infinite'
import { type Video, getVideosByChannelIDs } from '@/lib/algolia'

export const SEARCH_RESULT_COUNT = 9

type FetchNotEndedVideosOptions = {
  channelIDs?: string[]
}

export const fetchNotEndedVideos: Fetcher<
  Video[],
  FetchNotEndedVideosOptions
> = async ({ channelIDs = [] }) => {
  const baseTime = Temporal.Now.instant()
  const since = baseTime.subtract({ hours: 5 })
  const until = baseTime
    .toZonedDateTimeISO('UTC')
    .add({ months: 2 })
    .toInstant()
  const videos = await getVideosByChannelIDs(channelIDs, {
    filters: [
      `publishedAt >= ${since.epochSeconds}`,
      `publishedAt <= ${until.epochSeconds}`
    ],
    limit: 100
  })

  return videos.filter((video) => {
    const publishedAt = Temporal.Instant.fromEpochSeconds(video.publishedAt)
    const duration = Temporal.Duration.from(video.duration ?? 'P0D')
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
> = ({ channelIDs = [], page = 1, query = '' }) => {
  const baseTime = Temporal.Now.instant()
  const until = baseTime
    .toZonedDateTimeISO('UTC')
    .add({ months: 2 })
    .toInstant()

  return getVideosByChannelIDs(channelIDs, {
    filters: [`publishedAt <= ${until.epochSeconds}`],
    limit: SEARCH_RESULT_COUNT,
    page,
    query
  })
}

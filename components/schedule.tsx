import { Temporal } from '@js-temporal/polyfill'
import { type FC } from 'react'
import useSWR, { type Fetcher } from 'swr'
import { type Video, getVideosByChannelIDs } from '../lib/algolia'
import { useBaseTime } from './layout'
import NoResults from './no-results'
import { type Channel } from './search-results'
import Timeline from './timeline'

type FetchNotEndedVideosOptions = {
  baseTime: number
  channelIDs?: string[]
}

export const fetchNotEndedVideos: Fetcher<
  Video[],
  FetchNotEndedVideosOptions
> = async ({ baseTime: rawBaseTime, channelIDs = [] }) => {
  const baseTime = Temporal.Instant.fromEpochSeconds(rawBaseTime)
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

  return [...videos].reverse().filter((video) => {
    const publishedAt = Temporal.Instant.fromEpochSeconds(video.publishedAt)
    const duration = Temporal.Duration.from(video.duration ?? 'P0D')
    const endedAt = publishedAt.add(duration)

    return (
      Temporal.Instant.compare(endedAt, baseTime) >= 0 ||
      duration.total({ unit: 'second' }) < 1
    )
  })
}

type Props = {
  channels?: Channel[]
  prefetchedData: Video[]
}

const Schedule: FC<Props> = ({ channels = [], prefetchedData }) => {
  const baseTime = useBaseTime()
  const { data: videos = [] } = useSWR<
    Video[],
    Error,
    FetchNotEndedVideosOptions
  >(
    {
      baseTime: baseTime.epochSeconds,
      channelIDs: channels.map((channel) => channel.slug)
    },
    fetchNotEndedVideos,
    {
      fallbackData: prefetchedData,
      refreshInterval: 60_000
    }
  )

  return (
    <div className="margin-bottom--lg">
      {videos.length > 0 ? (
        <Timeline values={videos} />
      ) : (
        <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
      )}
    </div>
  )
}

export default Schedule

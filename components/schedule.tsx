import { Temporal } from '@js-temporal/polyfill'
import { type VFC } from 'react'
import useSWR, { type Fetcher } from 'swr'
import { type Video, getVideosByChannelIDs } from '../lib/algolia'
import { type Channel } from '../lib/supabase'
import { useNow } from './layout'
import NoResults from './no-results'
import Timeline from './timeline'

type FetchNotEndedVideosOptions = {
  channelIDs?: string[]
  now: number
}

export const fetchNotEndedVideos: Fetcher<
  Video[],
  FetchNotEndedVideosOptions
> = async ({ channelIDs = [], now: rawNow }) => {
  const now = Temporal.Instant.fromEpochSeconds(rawNow)
  const since = now.subtract({ hours: 5 })
  const until = now.toZonedDateTimeISO('UTC').add({ months: 2 }).toInstant()
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

    return Temporal.Instant.compare(endedAt, now) >= 0
  })
}

type Props = {
  channels?: Channel[]
  prefetchedData: Video[]
}

const Schedule: VFC<Props> = ({ channels = [], prefetchedData }) => {
  const now = useNow()
  const { data: videos = [] } = useSWR<
    Video[],
    Error,
    FetchNotEndedVideosOptions
  >(
    {
      channelIDs: channels.map((channel) => channel.slug),
      now: now.epochSeconds
    },
    fetchNotEndedVideos,
    {
      fallbackData: prefetchedData,
      refreshInterval: 10_000
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

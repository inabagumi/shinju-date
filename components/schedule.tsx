import { Temporal } from '@js-temporal/polyfill'
import { type VFC } from 'react'
import useSWR, { type Fetcher } from 'swr'
import { type Video, getVideosByChannelIDs } from '../lib/algolia'
import { type Channel } from '../lib/supabase'
import { useNow } from './layout'
import Timeline from './timeline'

function compareVideo(videoA: Video, videoB: Video): number {
  return videoA.publishedAt - videoB.publishedAt
}

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
      `publishedAt <= ${until.epochSeconds}`,
      'duration:P0D'
    ],
    limit: 100
  })

  return [...videos].sort(compareVideo)
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

  return <Timeline values={videos} />
}

export default Schedule

import { Temporal } from '@js-temporal/polyfill'
import { type VFC } from 'react'
import useSWR, { type BareFetcher } from 'swr'
import { type Video, getVideosByQuery } from '../lib/algolia'
import { useNow } from './layout'
import Timeline from './timeline'

function compareVideo(videoA: Video, videoB: Video): number {
  return videoA.publishedAt - videoB.publishedAt
}

export const getNotEndedVideos: BareFetcher<Video[]> = async (
  rawNow: number
) => {
  const now = Temporal.Instant.fromEpochSeconds(rawNow)
  const since = now.subtract({ hours: 5 })
  const until = now.toZonedDateTimeISO('UTC').add({ months: 2 }).toInstant()
  const videos = await getVideosByQuery({
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
  prefetchedData: Video[]
}

const Schedule: VFC<Props> = ({ prefetchedData }) => {
  const now = useNow()
  const { data: videos = [] } = useSWR<Video[]>(
    [now.epochSeconds],
    getNotEndedVideos,
    {
      fallbackData: prefetchedData,
      refreshInterval: 10_000
    }
  )

  return <Timeline values={videos} />
}

export default Schedule

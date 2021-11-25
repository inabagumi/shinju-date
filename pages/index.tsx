import { Temporal } from '@js-temporal/polyfill'
import { NextSeo } from 'next-seo'
import { useMemo } from 'react'
import useSWR from 'swr'
import Hero from '../components/hero'
import Page from '../components/layout'
import PopularitySearchQueries from '../components/popularity-search-queries'
import Timeline from '../components/timeline'
import { getVideosByQuery } from '../lib/algolia'
import type { Video } from '../lib/algolia'
import type { GetStaticProps, NextPage } from 'next'
import type { BareFetcher } from 'swr'

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

function compareVideo(videoA: Video, videoB: Video): number {
  const publishedAtA = Temporal.Instant.fromEpochSeconds(videoA.publishedAt)
  const publishedAtB = Temporal.Instant.fromEpochSeconds(videoB.publishedAt)

  return Temporal.Instant.compare(publishedAtA, publishedAtB)
}

const getNotEndedVideos: BareFetcher<Video[]> = async (
  now: Temporal.Instant
) => {
  const since = now.subtract({ hours: 5 })
  const videos = await getVideosByQuery({
    filters: [`publishedAt >= ${since.epochSeconds}`, 'duration:P0D'],
    limit: 100
  })

  return [...videos].sort(compareVideo)
}

type Props = {
  now: number
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({
  now: rawNow,
  videos: prefetchedData
}) => {
  const now = useMemo(() => Temporal.Instant.fromEpochSeconds(rawNow), [rawNow])
  const { data: videos = [] } = useSWR<Video[]>(now, getNotEndedVideos, {
    fallbackData: prefetchedData,
    refreshInterval: 10_000
  })

  return (
    <Page>
      <NextSeo
        canonical={new URL('/', process.env.NEXT_PUBLIC_BASE_URL).toString()}
        title="SHINJU DATE"
        titleTemplate={`%s - ${tagline}`}
      />

      <Hero />

      <div className="container margin-bottom--lg">
        <PopularitySearchQueries
          values={[
            'Minecraft',
            'ポケットモンスター',
            'リングフィット アドベンチャー',
            'Detroit: Become Human'
          ]}
        />

        <Timeline values={videos} />
      </div>
    </Page>
  )
}

export default SchedulePage

export const getStaticProps: GetStaticProps<Props> = async () => {
  const now = Temporal.Now.instant()
  const videos = await getNotEndedVideos(now)

  return {
    props: {
      now: now.epochSeconds,
      videos
    },
    revalidate: 1
  }
}

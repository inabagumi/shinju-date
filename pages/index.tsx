import {
  compareAsc,
  fromUnixTime,
  getUnixTime,
  parseISO,
  startOfHour,
  subHours
} from 'date-fns'
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

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

function compareVideo(videoA: Video, videoB: Video): number {
  const publishedAtA = fromUnixTime(videoA.publishedAt)
  const publishedAtB = fromUnixTime(videoB.publishedAt)

  return compareAsc(publishedAtA, publishedAtB)
}

async function getVideos(now: Date): Promise<Video[]> {
  const hours = startOfHour(now)
  const since = subHours(hours, 5)
  const videos = await getVideosByQuery({
    filters: [`publishedAt >= ${getUnixTime(since)}`, 'duration:P0D'],
    limit: 100
  })

  return [...videos].sort(compareVideo)
}

type Props = {
  now: string
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({
  now: rawNow,
  videos: prefetchedData
}) => {
  const now = useMemo(() => parseISO(rawNow), [rawNow])
  const { data: videos = [] } = useSWR<Video[], unknown, Date>(now, getVideos, {
    fallbackData: prefetchedData
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
            '桃太郎電鉄',
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
  const now = new Date()
  const videos = await getVideos(now)

  return {
    props: {
      now: now.toJSON(),
      videos
    },
    revalidate: 1
  }
}

import {
  compareAsc,
  fromUnixTime,
  getUnixTime,
  startOfHour,
  subHours
} from 'date-fns'
import { NextSeo } from 'next-seo'
import shareCard from '../assets/share-card.jpg'
import Hero from '../components/hero'
import Page from '../components/layout'
import PopularitySearchQueries from '../components/popularity-search-queries'
import Timeline from '../components/timeline'
import { getVideosByQuery } from '../lib/algolia'
import type { GetStaticProps, NextPage } from 'next'
import type { Video } from '../lib/algolia'

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

function compareVideo(videoA: Video, videoB: Video): number {
  const publishedAtA = fromUnixTime(videoA.publishedAt)
  const publishedAtB = fromUnixTime(videoB.publishedAt)

  return compareAsc(publishedAtA, publishedAtB)
}

type Props = {
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({ videos }) => {
  const baseURL = process.env.NEXT_PUBLIC_BASE_URL
  const description = process.env.NEXT_PUBLIC_DESCRIPTION

  return (
    <Page>
      <NextSeo
        canonical={new URL('/', baseURL).toString()}
        description={description}
        openGraph={{
          images: [
            {
              height: shareCard.height,
              url: new URL(shareCard.src, baseURL).toString(),
              width: shareCard.width
            }
          ],
          type: 'website'
        }}
        title="SHINJU DATE"
        titleTemplate={`%s - ${tagline}`}
        twitter={{
          cardType: 'summary_large_image'
        }}
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
  const hours = startOfHour(new Date())
  const since = subHours(hours, 5)
  const videos = await getVideosByQuery({
    filters: [`publishedAt >= ${getUnixTime(since)}`, 'duration:P0D'],
    limit: 100
  })

  return {
    props: {
      videos: [...videos].sort(compareVideo)
    },
    revalidate: 1
  }
}

import { Temporal } from '@js-temporal/polyfill'
import { type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Hero from '../components/hero'
import Page from '../components/layout'
import PopularitySearchQueries from '../components/popularity-search-queries'
import Schedule, { getNotEndedVideos } from '../components/schedule'
import { type Video } from '../lib/algolia'

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

type Props = {
  now: number
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({ now, videos }) => {
  return (
    <Page now={now}>
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
            '龍が如く',
            'Phasmophobia'
          ]}
        />

        <Schedule prefetchedData={videos} />
      </div>
    </Page>
  )
}

export default SchedulePage

export const getStaticProps: GetStaticProps<Props> = async () => {
  const now = Temporal.Now.instant().epochSeconds
  const videos = await getNotEndedVideos(now)

  return {
    props: {
      now,
      videos
    },
    revalidate: 1
  }
}

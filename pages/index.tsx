import { Temporal } from '@js-temporal/polyfill'
import { SkipNavContent } from '@reach/skip-nav'
import { type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Hero from '../components/hero'
import Page, { DEFAULT_SKIP_NAV_CONTENT_ID } from '../components/layout'
import PopularitySearchQueries from '../components/popularity-search-queries'
import Schedule, { fetchNotEndedVideos } from '../components/schedule'
import { type Video } from '../lib/algolia'

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

type Props = {
  baseTime: number
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({ baseTime, videos }) => {
  return (
    <Page baseTime={baseTime}>
      <NextSeo
        canonical={new URL('/', process.env.NEXT_PUBLIC_BASE_URL).toString()}
        title="SHINJU DATE"
        titleTemplate={`%s - ${tagline}`}
      />

      <Hero />

      <SkipNavContent
        as="main"
        className="container"
        id={DEFAULT_SKIP_NAV_CONTENT_ID}
      >
        <PopularitySearchQueries
          values={[
            'Minecraft',
            'ポケットモンスター',
            'マリオパーティ',
            'Phasmophobia'
          ]}
        />

        <Schedule prefetchedData={videos} />
      </SkipNavContent>
    </Page>
  )
}

export default SchedulePage

export const getStaticProps: GetStaticProps<Props> = async () => {
  const baseTime = Temporal.Now.instant().epochSeconds
  const videos = await fetchNotEndedVideos({ baseTime })

  return {
    props: { baseTime, videos },
    revalidate: 60
  }
}

import { isFuture, startOfHour, subHours } from 'date-fns'
import { NextSeo } from 'next-seo'
import useSWR from 'swr'
import shareCard from '../assets/share-card.jpg'
import Hero from '../components/hero'
import Page from '../components/layout'
import PopularitySearchQueries from '../components/popularity-search-queries'
import Timeline from '../components/timeline'
import type { NextPage } from 'next'
import type SearchResponseBody from '../types/SearchResponseBody'

const tagline =
  '774 inc. 所属タレントの配信スケジュールや動画の検索ができるウェブサービス'

const getRequestURL = (now = new Date()): string => {
  const hours = startOfHour(now)
  const since = subHours(hours, 5)
  const searchParams = new URLSearchParams({
    count: '100',
    since: since.toJSON()
  })

  return `/api/search?${searchParams.toString()}`
}

const IndexPage: NextPage = () => {
  const { data: items } = useSWR<SearchResponseBody>(() => getRequestURL())

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
          keywords={[
            'Minecraft',
            '桃太郎電鉄',
            'リングフィット アドベンチャー',
            'Detroit: Become Human'
          ]}
        />

        <Timeline
          values={items?.filter(
            (item) => isFuture(item.publishedAt) || !item.duration
          )}
        />
      </div>
    </Page>
  )
}

export default IndexPage

import { Temporal } from '@js-temporal/polyfill'
import { NextSeo } from 'next-seo'
import Page from '../../components/layout'
import SearchResults, {
  getVideosByChannelIDsWithPage
} from '../../components/search-results'
import type { Channel, Video } from '../../lib/algolia'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'

type Props = {
  channel?: Channel
  now: number
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ now, query, videos }) => {
  const basePath = '/videos'
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return (
    <Page basePath={basePath} now={now}>
      <NextSeo
        canonical={new URL(
          `${basePath}${query ? `/${encodeURIComponent(query)}` : ''}`,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        noindex={!!query}
        title={title}
      />

      <SearchResults prefetchedData={[videos]} query={query} title={title} />
    </Page>
  )
}

export default VideosPage

type Params = {
  q: string[]
}

export const getStaticPaths: GetStaticPaths<Params> = () => {
  return {
    fallback: 'blocking',
    paths: []
  }
}

export const getStaticProps: GetStaticProps<Props, Params> = async ({
  params
}) => {
  const now = Temporal.Now.instant().epochSeconds
  const query = params?.q?.join('/') ?? ''
  const videos = await getVideosByChannelIDsWithPage(now, [], 1, query)

  return {
    props: {
      now,
      query,
      videos
    },
    revalidate: 5
  }
}

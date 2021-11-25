import { NextSeo } from 'next-seo'
import Page from '../../components/layout'
import SearchResults, {
  getVideosByChannelIDsWithPage
} from '../../components/search-results'
import type { Channel, Video } from '../../lib/algolia'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'

type Props = {
  channel?: Channel
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ query, videos }) => {
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return (
    <Page basePath="/videos">
      <NextSeo
        canonical={new URL(
          query ? `/videos?q=${encodeURIComponent(query)}` : '/videos',
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        noindex={!!query}
        title={title}
      />

      <SearchResults
        basePath="/video"
        prefetchedData={[videos]}
        query={query}
        title={title}
      />
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
  const query = params?.q?.join('/') ?? ''
  const videos = await getVideosByChannelIDsWithPage([], 1, query)

  return {
    props: {
      query,
      videos
    },
    revalidate: 5
  }
}

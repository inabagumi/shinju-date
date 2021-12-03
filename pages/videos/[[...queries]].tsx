import { Temporal } from '@js-temporal/polyfill'
import { SkipNavContent } from '@reach/skip-nav'
import { type GetStaticPaths, type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Page, { DEFAULT_SKIP_NAV_CONTENT_ID } from '../../components/layout'
import SearchResults, {
  fetchVideosByChannelIDs
} from '../../components/search-results'
import { type Video } from '../../lib/algolia'

type Props = {
  baseTime: number
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ baseTime, query, videos }) => {
  const basePath = '/videos'
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return (
    <Page basePath={basePath} baseTime={baseTime}>
      <NextSeo
        canonical={new URL(
          `${basePath}${query ? `/${encodeURIComponent(query)}` : ''}`,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        noindex={!!query}
        title={title}
      />

      <SkipNavContent as="main" id={DEFAULT_SKIP_NAV_CONTENT_ID}>
        <SearchResults prefetchedData={[videos]} query={query} title={title} />
      </SkipNavContent>
    </Page>
  )
}

export default VideosPage

type Params = {
  queries?: string[]
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
  const baseTime = Temporal.Now.instant().epochSeconds
  const query = params?.queries?.join('/') ?? ''
  const videos = await fetchVideosByChannelIDs({ baseTime, query })

  return {
    props: { baseTime, query, videos },
    revalidate: 5
  }
}

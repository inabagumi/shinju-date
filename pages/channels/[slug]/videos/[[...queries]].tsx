import { Temporal } from '@js-temporal/polyfill'
import { SkipNavContent } from '@reach/skip-nav'
import { type GetStaticPaths, type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Page, {
  DEFAULT_SKIP_NAV_CONTENT_ID
} from '../../../../components/layout'
import SearchResults, {
  type Channel,
  fetchVideosByChannelIDs
} from '../../../../components/search-results'
import { type Video } from '../../../../lib/algolia'
import { getChannelBySlug } from '../../../../lib/supabase'

type Props = {
  baseTime: number
  channel: Channel
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ baseTime, channel, query, videos }) => {
  const basePath = `/channels/${channel.slug}`
  const title = query
    ? `『${query}』の検索結果 - ${channel.name}`
    : `『${channel.name}』の動画一覧`

  return (
    <Page basePath={basePath} baseTime={baseTime}>
      <NextSeo
        canonical={new URL(
          `${basePath}/videos${query ? `/${encodeURIComponent(query)}` : ''}`,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        noindex={!!query}
        title={title}
      />

      <SkipNavContent as="main" id={DEFAULT_SKIP_NAV_CONTENT_ID}>
        <SearchResults
          channels={channel ? [channel] : undefined}
          prefetchedData={[videos]}
          query={query}
          title={title}
        />
      </SkipNavContent>
    </Page>
  )
}

export default VideosPage

type Params = {
  queries?: string[]
  slug: string
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
  if (params) {
    const baseTime = Temporal.Now.instant().epochSeconds
    const query = params?.queries?.join('/') ?? ''
    const [channel, videos] = await Promise.all([
      getChannelBySlug(params.slug),
      fetchVideosByChannelIDs({
        baseTime,
        channelIDs: [params.slug],
        query
      })
    ])

    if (channel) {
      return {
        props: { baseTime, channel, query, videos },
        revalidate: query ? 600 : 60
      }
    }
  }

  return {
    notFound: true,
    revalidate: 60
  }
}

import { Temporal } from '@js-temporal/polyfill'
import { type GetStaticPaths, type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Page from '../../../../components/layout'
import SearchResults, {
  fetchVideosByChannelIDs
} from '../../../../components/search-results'
import { type Video } from '../../../../lib/algolia'
import { type Channel, getChannelBySlug } from '../../../../lib/supabase'

type Props = {
  channel: Channel
  now: number
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ channel, now, query, videos }) => {
  const basePath = `/channels/${channel.slug}`
  const title = query
    ? `『${query}』の検索結果 - ${channel.name}`
    : `『${channel.name}』の動画一覧`

  return (
    <Page basePath={basePath} now={now}>
      <NextSeo
        canonical={new URL(
          `${basePath}/videos${query ? `/${encodeURIComponent(query)}` : ''}`,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        noindex={!!query}
        title={title}
      />

      <SearchResults
        channels={channel ? [channel] : undefined}
        prefetchedData={[videos]}
        query={query}
        title={title}
      />
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
    const now = Temporal.Now.instant().epochSeconds
    const query = params?.queries?.join('/') ?? ''
    const [channel, videos] = await Promise.all([
      getChannelBySlug(params.slug),
      fetchVideosByChannelIDs({
        channelIDs: [params.slug],
        now,
        query
      })
    ])

    if (channel) {
      return {
        props: { channel, now, query, videos },
        revalidate: 5
      }
    }
  }

  return {
    notFound: true,
    revalidate: 60
  }
}

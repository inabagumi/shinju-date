import { Temporal } from '@js-temporal/polyfill'
import { type GetStaticPaths, type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Page from '../../../../components/layout'
import SearchResults, {
  fetchVideosByChannelIDs
} from '../../../../components/search-results'
import { type Video } from '../../../../lib/algolia'
import { type Group, getGroupBySlug } from '../../../../lib/supabase'

type Props = {
  group: Group
  now: number
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ group, now, query, videos }) => {
  const basePath = `/groups/${group.slug}/videos`
  const title = query
    ? `『${query}』の検索結果 - ${group.name}`
    : `『${group.name}』の動画一覧`

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

      <SearchResults
        channels={group.channels}
        prefetchedData={[videos]}
        query={query}
        title={title}
      />
    </Page>
  )
}

export default VideosPage

type Params = {
  id: string
  q?: string[]
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
    const group = await getGroupBySlug(params.id)

    if (group && group.channels.length > 0) {
      const now = Temporal.Now.instant().epochSeconds
      const query = params.q?.join('/') ?? ''
      const channelIDs = group.channels.map((channel) => channel.slug)

      const videos = await fetchVideosByChannelIDs(now, channelIDs, 1, query)

      return {
        props: {
          group,
          now,
          query,
          videos
        },
        revalidate: 5
      }
    }
  }

  return {
    notFound: true
  }
}

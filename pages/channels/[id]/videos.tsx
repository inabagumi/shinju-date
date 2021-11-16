import { NextSeo } from 'next-seo'
import Page from '../../../components/layout'
import SearchResults, {
  SEARCH_RESULT_COUNT
} from '../../../components/search-results'
import { getChannelByID, getVideosByChannelID } from '../../../lib/algolia'
import { getQueryValue } from '../../../lib/url'
import type { Channel, Video } from '../../../lib/algolia'
import type { GetServerSideProps, NextPage } from 'next'

type Props = {
  channel: Channel
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ channel, query, videos }) => {
  const basePath = `/channels/${channel.id}/videos`
  const title = query
    ? `『${query}』の検索結果 - ${channel?.title}`
    : `『${channel.title}』の動画一覧`

  return (
    <Page>
      <NextSeo
        canonical={new URL(
          query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        noindex
        title={title}
      />

      <SearchResults
        basePath={basePath}
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
  id: string
}

export const getServerSideProps: GetServerSideProps<Props, Params> = async ({
  params,
  query
}) => {
  const channelID = params?.id
  const q = getQueryValue('q', query) ?? ''

  if (channelID) {
    const [channel, videos] = await Promise.all([
      getChannelByID(channelID).catch(() => undefined),
      getVideosByChannelID(channelID, {
        limit: SEARCH_RESULT_COUNT,
        page: 1,
        query: q
      })
    ])

    if (channel) {
      return {
        props: {
          channel,
          query: q,
          videos
        }
      }
    }
  }

  return {
    notFound: true
  }
}

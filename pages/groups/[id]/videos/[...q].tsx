import { NextSeo } from 'next-seo'
import Page from '../../../../components/layout'
import SearchResults, {
  getVideosByChannelIDsWithPage
} from '../../../../components/search-results'
import { getChannelsByGroupID } from '../../../../lib/algolia'
import type { Channel, Group, Video } from '../../../../lib/algolia'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'

type Props = {
  channels: Channel[]
  group: Group
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ channels, group, query, videos }) => {
  const basePath = `/groups/${group.id}/videos`
  const title = query
    ? `『${query}』の検索結果 - ${group.title}`
    : `『${group.title}』の動画一覧`

  return (
    <Page basePath={basePath}>
      <NextSeo
        canonical={new URL(
          query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        title={title}
      />

      <SearchResults
        basePath={basePath}
        channels={channels}
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
  const groupID = params?.id
  const query = params?.q?.join('/') ?? ''

  if (groupID) {
    const channels = await getChannelsByGroupID(groupID)

    if (channels.length > 0) {
      const channelIDs = channels.map((channel) => channel.id)
      const videos = await getVideosByChannelIDsWithPage(channelIDs, 1, query)

      return {
        props: {
          channels,
          group: channels[0].group,
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

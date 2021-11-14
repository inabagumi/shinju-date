import { NextSeo } from 'next-seo'
import shareCard from '../../../assets/share-card.jpg'
import Page from '../../../components/layout'
import SearchResults, {
  SEARCH_RESULT_COUNT
} from '../../../components/search-results'
import {
  getChannelsByGroupID,
  getVideosByChannelIDs
} from '../../../lib/algolia'
import type { GetServerSideProps, NextPage } from 'next'
import type { Channel, Group, Video } from '../../../lib/algolia'

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
    <Page>
      <NextSeo
        canonical={new URL(
          query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        description={process.env.NEXT_PUBLIC_DESCRIPTION}
        noindex
        openGraph={{
          images: [
            {
              height: shareCard.height,
              url: new URL(
                shareCard.src,
                process.env.NEXT_PUBLIC_BASE_URL
              ).toString(),
              width: shareCard.width
            }
          ],
          type: 'website'
        }}
        title={title}
        twitter={{
          cardType: 'summary_large_image'
        }}
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
}

export const getServerSideProps: GetServerSideProps<Props, Params> = async ({
  params,
  query
}) => {
  const groupID = params?.id
  const q = Array.isArray(query.q) ? query.q.join(' ') : query.q ?? ''

  if (groupID) {
    const channels = await getChannelsByGroupID(groupID)

    if (channels.length > 0) {
      const videos = await getVideosByChannelIDs(
        channels.map((channel) => channel.id),
        {
          limit: SEARCH_RESULT_COUNT,
          page: 1,
          query: q
        }
      )

      return {
        props: {
          group: channels[0].group,
          channels,
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

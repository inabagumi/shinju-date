import { NextSeo } from 'next-seo'
import shareCard from '../../../assets/share-card.jpg'
import Page from '../../../components/layout'
import SearchResults, {
  SEARCH_RESULT_COUNT
} from '../../../components/search-results'
import {
  getChannelByID,
  getVideosByChannelID,
  getVideosByQuery
} from '../../../lib/algolia'
import type { GetServerSideProps, NextPage } from 'next'
import type { Channel, Video } from '../../../lib/algolia'

type Props = {
  channel?: Channel
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ channel, query, videos }) => {
  const basePath = channel ? `/channels/${channel.id}/videos` : '/videos'
  const title = query
    ? [`『${query}』の検索結果`, channel?.title].filter(Boolean).join(' - ')
    : channel
    ? `『${channel.title}』の動画一覧`
    : '動画一覧'

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
  id: '_all' | string
}

export const getServerSideProps: GetServerSideProps<Props, Params> = async ({
  params,
  query
}) => {
  const channelID = params?.id && (params.id === '_all' ? undefined : params.id)
  const q = Array.isArray(query.q) ? query.q.join(' ') : query.q ?? ''

  if (channelID) {
    const [channel, videos] = await Promise.all([
      getChannelByID(channelID).catch(() => undefined),
      getVideosByChannelID(channelID, {
        limit: SEARCH_RESULT_COUNT,
        page: 1
      })
    ])

    if (!channel) {
      return {
        notFound: true
      }
    }

    return {
      props: {
        channel,
        query: q,
        videos
      }
    }
  }

  const videos = await getVideosByQuery({
    limit: SEARCH_RESULT_COUNT,
    page: 1
  })

  return {
    props: {
      query: q,
      videos
    }
  }
}

import { Temporal } from '@js-temporal/polyfill'
import { NextSeo } from 'next-seo'
import Page from '../../../../components/layout'
import SearchResults, {
  getVideosByChannelIDsWithPage
} from '../../../../components/search-results'
import { getChannelByID } from '../../../../lib/algolia'
import type { Channel, Video } from '../../../../lib/algolia'
import type { GetStaticPaths, GetStaticProps, NextPage } from 'next'

type Props = {
  channel: Channel
  now: number
  query: string
  videos: Video[]
}

const VideosPage: NextPage<Props> = ({ channel, now, query, videos }) => {
  const basePath = `/channels/${channel.id}/videos`
  const title = query
    ? `『${query}』の検索結果 - ${channel?.title}`
    : `『${channel.title}』の動画一覧`

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
  const channelID = params?.id
  const query = params?.q?.join('/') ?? ''

  if (channelID) {
    const now = Temporal.Now.instant().epochSeconds
    const [channel, videos] = await Promise.all([
      getChannelByID(channelID).catch(() => undefined),
      getVideosByChannelIDsWithPage(now, [channelID], 1, query)
    ])

    if (channel) {
      return {
        props: {
          channel,
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

import { Temporal } from '@js-temporal/polyfill'
import { SkipNavContent } from '@reach/skip-nav'
import { type GetStaticPaths, type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import Page, { DEFAULT_SKIP_NAV_CONTENT_ID } from '../../../components/layout'
import Link from '../../../components/link'
import Schedule, { fetchNotEndedVideos } from '../../../components/schedule'
import { type Video } from '../../../lib/algolia'
import { getChannelBySlug } from '../../../lib/supabase'

type Props = {
  baseTime: number
  channel: NonNullable<Awaited<ReturnType<typeof getChannelBySlug>>>
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({ channel, baseTime, videos }) => {
  const basePath = `/channels/${channel.slug}`

  return (
    <Page basePath={basePath} baseTime={baseTime}>
      <NextSeo
        canonical={new URL(
          basePath,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        title={channel.name}
      />

      <div className="hero hero--dark">
        <div className="container">
          <h1 className="hero__title">{channel.name}</h1>

          <div>
            <Link
              className="button button--lg button--secondary"
              href={`${basePath}/videos`}
              role="button"
            >
              動画一覧
            </Link>
          </div>
        </div>
      </div>

      <SkipNavContent
        as="main"
        className="container"
        id={DEFAULT_SKIP_NAV_CONTENT_ID}
      >
        <h2 className="margin-top--lg">今後の配信予定</h2>

        <Schedule channels={[channel]} prefetchedData={videos} />
      </SkipNavContent>
    </Page>
  )
}

export default SchedulePage

type Params = {
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
    const [channel, videos] = await Promise.all([
      getChannelBySlug(params.slug),
      fetchNotEndedVideos({
        baseTime,
        channelIDs: [params.slug]
      })
    ])

    if (channel) {
      return {
        props: { baseTime, channel, videos },
        revalidate: 60
      }
    }
  }

  return {
    notFound: true,
    revalidate: 60
  }
}

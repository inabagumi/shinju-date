import { Temporal } from '@js-temporal/polyfill'
import { SkipNavContent } from '@reach/skip-nav'
import { type GetStaticPaths, type GetStaticProps, type NextPage } from 'next'
import { NextSeo } from 'next-seo'
import { useCurrentGroup } from '../../../components/group'
import Page, { DEFAULT_SKIP_NAV_CONTENT_ID } from '../../../components/layout'
import Link from '../../../components/link'
import Schedule, { fetchNotEndedVideos } from '../../../components/schedule'
import { type Video } from '../../../lib/algolia'
import { getGroupBySlug } from '../../../lib/supabase'

type Group = NonNullable<Awaited<ReturnType<typeof getGroupBySlug>>>

export function normalizeChannels(channels?: Group['channels']) {
  return channels ? (Array.isArray(channels) ? channels : [channels]) : []
}

type Props = {
  baseTime: number
  group: Group
  videos: Video[]
}

const SchedulePage: NextPage<Props> = ({ baseTime, group, videos }) => {
  useCurrentGroup(group)

  const basePath = `/groups/${group.slug}`
  const channels = normalizeChannels(group.channels)

  return (
    <Page basePath={basePath} baseTime={baseTime}>
      <NextSeo
        canonical={new URL(
          basePath,
          process.env.NEXT_PUBLIC_BASE_URL
        ).toString()}
        title={group.name}
      />

      <div className="hero hero--dark">
        <div className="container">
          <h1 className="hero__title">{group.name}</h1>

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

        <Schedule channels={channels} prefetchedData={videos} />
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
    const group = await getGroupBySlug(params.slug)
    const channels = normalizeChannels(group?.channels)

    if (group && channels.length > 0) {
      const baseTime = Temporal.Now.instant().epochSeconds
      const channelIDs = channels.map((channel) => channel.slug)
      const videos = await fetchNotEndedVideos({ baseTime, channelIDs })

      return {
        props: { baseTime, group, videos },
        revalidate: 60
      }
    }
  }

  return {
    notFound: true,
    revalidate: 60
  }
}

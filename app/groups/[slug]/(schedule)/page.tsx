import merge from 'lodash.merge'
import { type Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import baseMetadata from '@/app/metadata'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import { getChannelsByGroup, getGroupBySlug } from '@/lib/supabase'
import NoResults from '@/ui/no-results'
import SimpleDocument from '@/ui/simple-document'
import Timeline from '@/ui/timeline'

// export const runtime = 'edge'
export const revalidate = 60

type Params = {
  slug: string
}

type Props = {
  params: Params
}

export async function generateMetadata({
  params
}: Props): Promise<Metadata | null> {
  const group = await getGroupBySlug(params.slug)

  if (!group) {
    return null
  }

  const title = group.name

  return merge(baseMetadata, {
    alternates: {
      canonical: `/groups/${group.slug}`
    },
    openGraph: {
      title,
      type: 'article'
    },
    title,
    twitter: {
      title: `${title} - SHINJU DATE`
    }
  })
}

export default async function Page({ params }: Props): Promise<JSX.Element> {
  const group = await getGroupBySlug(params.slug)

  if (!group) {
    notFound()
  }

  const channels = getChannelsByGroup(group)
  const videos = await fetchNotEndedVideos({
    channelIDs: channels.map((channel) => channel.slug)
  })

  return (
    <SimpleDocument
      button={
        <Link
          className="button button--lg button--secondary"
          href={`/groups/${group.slug}/videos`}
          role="button"
        >
          動画一覧
        </Link>
      }
      title={group.name}
    >
      <h2 className="margin-top--lg">今後の配信予定</h2>

      {videos.length > 0 ? (
        <Timeline channels={channels} prefetchedData={videos} />
      ) : (
        <NoResults message="YouTubeに登録されている配信予定の動画がありません。" />
      )}
    </SimpleDocument>
  )
}

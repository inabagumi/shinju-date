import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import NoResults from '@/components/no-results'
import SimpleDocument from '@/components/simple-document'
import Timeline from '@/components/timeline'
import { title as siteName } from '@/lib/constants'
import { fetchNotEndedVideos } from '@/lib/fetchers'
import { getChannelBySlug } from '@/lib/supabase'

export const revalidate = 600 // 10 minutes

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{
    slug: string
  }>
}>): Promise<Metadata | null> {
  const { slug } = await params
  const channel = await getChannelBySlug(slug)

  if (!channel) {
    return null
  }

  const title = channel.name

  return {
    alternates: {
      canonical: `/channels/${channel.slug}`,
    },
    openGraph: {
      siteName,
      title,
      type: 'article',
    },
    title,
    twitter: {
      title: `${title} - ${siteName}`,
    },
  }
}

export default async function ChannelSchedulePage({
  params,
}: Readonly<{
  params: Promise<{
    slug: string
  }>
}>) {
  const { slug } = await params
  const channel = await getChannelBySlug(slug)

  if (!channel) {
    notFound()
  }

  const videos = await fetchNotEndedVideos({
    channelIDs: [channel.slug],
  })

  return (
    <SimpleDocument
      button={
        <Link
          className="inline-block rounded-lg bg-primary-foreground px-6 py-1.5 text-primary hover:bg-774-nevy-100"
          href={`/channels/${channel.slug}/videos`}
        >
          動画一覧
        </Link>
      }
      title={channel.name}
    >
      <h2 className="font-semibold text-xl">今後の配信予定</h2>

      {videos.length > 0 ? (
        <Timeline channels={[channel]} prefetchedData={videos} />
      ) : (
        <NoResults
          basePath={`/channels/${channel.slug}`}
          message="YouTubeに登録されている配信予定の動画がありません。"
        />
      )}
    </SimpleDocument>
  )
}

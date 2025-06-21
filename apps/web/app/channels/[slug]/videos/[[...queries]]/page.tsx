import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import NoResults from '@/components/no-results'
import SearchResults from '@/components/search-results'
import { title as siteName } from '@/lib/constants'
import { fetchVideosByChannelIDs } from '@/lib/fetchers'
import { getChannelBySlug } from '@/lib/supabase'
import { parseQueries } from '@/lib/url'

export const revalidate = 300 // 5 minutes

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{
    queries?: string[]
    slug: string
  }>
}>): Promise<Metadata | null> {
  const { queries, slug } = await params
  const channel = await getChannelBySlug(slug)

  if (!channel) {
    return null
  }

  const query = parseQueries(queries)
  const title = query
    ? `『${query}』の検索結果 - ${channel.name}`
    : `『${channel.name}』の動画一覧`

  return {
    alternates: {
      canonical: query
        ? `/channels/${channel.slug}/videos/${encodeURIComponent(query)}`
        : `/channels/${channel.slug}/videos`,
      types: {
        'text/calendar': !query ? `/channels/${channel.slug}/videos.ics` : null,
      },
    },
    openGraph: {
      siteName,
      title,
      type: 'article',
    },
    robots: {
      index: !query,
    },
    title,
    twitter: {
      title: `${title} - ${siteName}`,
    },
  }
}

export default async function VideosPage({
  params,
}: Readonly<{
  params: Promise<{
    queries?: string[]
    slug: string
  }>
}>) {
  const { queries, slug } = await params
  const channel = await getChannelBySlug(slug)

  if (!channel) {
    notFound()
  }

  const query = parseQueries(queries)
  const videos = await fetchVideosByChannelIDs({
    channelIDs: [channel.id],
    query,
  })

  if (videos.length < 1) {
    const message = query
      ? `『${query}』で検索しましたが一致する動画は見つかりませんでした。`
      : '動画は見つかりませんでした。'

    return <NoResults message={message} title="検索結果はありません" />
  }

  const title = query
    ? `『${query}』の検索結果 - ${channel.name}`
    : `『${channel.name}』の動画一覧`

  return (
    <>
      <h1 className="text-xl font-semibold">{title}</h1>

      <SearchResults
        channels={[channel]}
        prefetchedData={[videos]}
        query={query}
      />
    </>
  )
}

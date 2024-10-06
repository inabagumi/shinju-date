import { type Metadata } from 'next'
import NoResults from '@/components/no-results'
import SearchResults from '@/components/search-results'
import { title as siteName } from '@/lib/constants'
import { fetchVideosByChannelIDs } from '@/lib/fetchers'
import { parseQueries } from '@/lib/url'

export const revalidate = 300 // 5 minutes

export async function generateMetadata({
  params
}: Readonly<{
  params: Promise<{
    queries?: string[]
  }>
}>): Promise<Metadata> {
  const { queries } = await params
  const query = parseQueries(queries)
  const title = query ? `『${query}』の検索結果` : '動画一覧'

  return {
    alternates: {
      canonical: query ? `/videos/${encodeURIComponent(query)}` : '/videos',
      types: {
        'text/calendar': !query ? '/videos.ics' : null
      }
    },
    openGraph: {
      siteName,
      title,
      type: 'article'
    },
    robots: {
      index: !query
    },
    title,
    twitter: {
      title: `${title} - ${siteName}`
    }
  }
}

export default async function VideosPage({
  params
}: Readonly<{
  params: Promise<{
    queries?: string[]
  }>
}>) {
  const { queries } = await params
  const query = parseQueries(queries)

  const title = query ? `『${query}』の検索結果` : '動画一覧'
  const videos = await fetchVideosByChannelIDs({ query })

  if (videos.length < 1) {
    const message = query
      ? `『${query}』で検索しましたが一致する動画は見つかりませんでした。`
      : '動画は見つかりませんでした。'

    return <NoResults message={message} title="検索結果はありません" />
  }

  return (
    <>
      <h1 className="text-xl font-semibold">{title}</h1>

      <SearchResults prefetchedData={[videos]} query={query} />
    </>
  )
}

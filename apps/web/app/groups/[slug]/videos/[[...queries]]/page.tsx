import clsx from 'clsx'
import { type Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Balancer from 'react-wrap-balancer'
import styles from '@/app/videos/[[...queries]]/page.module.css'
import { title as siteName } from '@/lib/constants'
import { fetchVideosByChannelIDs } from '@/lib/fetchers'
import { getChannelsByGroup, getGroupBySlug } from '@/lib/supabase'
import { parseQueries } from '@/lib/url'
import NoResults from '@/ui/no-results'
import SearchResults from '@/ui/search-results'

// TODO: timeout
// export const runtime = 'edge'
export const revalidate = 5

type Params = {
  queries?: string[]
  slug: string
}

type SearchParams = {
  q?: string | string[]
}

type Props = {
  params: Params
  searchParams: SearchParams
}

export async function generateMetadata({
  params
}: Props): Promise<Metadata | null> {
  const group = await getGroupBySlug(params.slug)

  if (!group) {
    return null
  }

  const query = parseQueries(params.queries)
  const title = query
    ? `『${query}』の検索結果 - ${group.name}`
    : `『${group.name}』の動画一覧`

  return {
    alternates: {
      canonical: query
        ? `/groups/${group.slug}/videos/${encodeURIComponent(query)}`
        : `/groups/${group.slug}/videos`,
      types: {
        'text/calendar': !query ? `/groups/${group.slug}/videos.ics` : null
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

export default async function Page({
  params,
  searchParams
}: Props): Promise<JSX.Element> {
  const group = await getGroupBySlug(params.slug)

  if (!group) {
    notFound()
  }

  const query = parseQueries(params.queries)

  if (!query && searchParams.q) {
    const value = Array.isArray(searchParams.q)
      ? searchParams.q.join(' ')
      : searchParams.q

    redirect(`/groups/${group.slug}/videos/${encodeURIComponent(value)}`)
  }

  const channels = getChannelsByGroup(group)
  const videos = await fetchVideosByChannelIDs({
    channelIDs: channels.map((channel) => channel.slug),
    query
  })

  if (videos.length < 1) {
    const message = query
      ? `『${query}』で検索しましたが一致する動画は見つかりませんでした。`
      : '動画は見つかりませんでした。'

    return <NoResults message={message} title="検索結果はありません" />
  }

  const title = query
    ? `『${query}』の検索結果 - ${group.name}`
    : `『${group.name}』の動画一覧`

  return (
    <div className="margin-top--lg">
      <h1 className={clsx('margin-bottom--lg', styles.title)}>
        <Balancer>{title}</Balancer>
      </h1>

      <SearchResults
        channels={channels}
        prefetchedData={[videos]}
        query={query}
      />
    </div>
  )
}

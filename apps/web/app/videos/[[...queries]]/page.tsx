import clsx from 'clsx'
import { type Metadata } from 'next'
import { redirect } from 'next/navigation'
import Balancer from 'react-wrap-balancer'
import NoResults from '@/components/no-results'
import SearchResults from '@/components/search-results'
import { title as siteName } from '@/lib/constants'
import { fetchVideosByChannelIDs } from '@/lib/fetchers'
import { parseQueries } from '@/lib/url'
import styles from './page.module.css'

export const runtime = 'edge'
export const revalidate = 5

type Params = {
  queries?: string[]
}

type SearchParams = {
  q?: string | string[]
}

type Props = {
  params: Params
  searchParams: SearchParams
}

export function generateMetadata({ params }: Props): Metadata {
  const query = parseQueries(params.queries)
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

export default async function Page({
  params,
  searchParams
}: Props): Promise<JSX.Element> {
  const query = parseQueries(params.queries)

  if (!query && searchParams.q) {
    const value = Array.isArray(searchParams.q)
      ? searchParams.q.join(' ')
      : searchParams.q

    redirect(`/videos/${encodeURIComponent(value)}`)
  }

  const title = query ? `『${query}』の検索結果` : '動画一覧'
  const videos = await fetchVideosByChannelIDs({ query })

  if (videos.length < 1) {
    const message = query
      ? `『${query}』で検索しましたが一致する動画は見つかりませんでした。`
      : '動画は見つかりませんでした。'

    return <NoResults message={message} title="検索結果はありません" />
  }

  return (
    <div className="margin-top--lg">
      <h1 className={clsx('margin-bottom--lg', styles['title'])}>
        <Balancer>{title}</Balancer>
      </h1>

      <SearchResults prefetchedData={[videos]} query={query} />
    </div>
  )
}

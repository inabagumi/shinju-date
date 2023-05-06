'use client'

import clsx from 'clsx'
import Link from 'next/link'
import useSWR from 'swr'
import Skeleton from '@/ui/skeleton'
import styles from './recommendation-queries.module.css'

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)

  return res.json() as T
}

export function RecommendationQueriesSkeleton(): JSX.Element {
  return (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        <li className={clsx('pills__item', styles.pill)}>
          <Skeleton />
        </li>
        <li className={clsx('pills__item', styles.pill)}>
          <Skeleton />
        </li>
        <li className={clsx('pills__item', styles.pill)}>
          <Skeleton />
        </li>
        <li className={clsx('pills__item', styles.pill)}>
          <Skeleton />
        </li>
      </ul>
    </div>
  )
}

export default function RecommendationQueries(): JSX.Element | null {
  const { data: queries } = useSWR<string[]>('/api/queries', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  })

  if (!queries) {
    return <RecommendationQueriesSkeleton />
  }

  return (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        {queries.map((query) => (
          <li className={clsx('pills__item', styles.pill)} key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className={styles.pillLink}
              href={`/videos/${encodeURIComponent(query)}`}
              title={`『${query}』の検索結果`}
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { use } from 'react'
import Skeleton from '@/ui/skeleton'
import styles from './recommendation-queries.module.css'

type Fn = () => Promise<string[]>

const cacheMap = new WeakMap<Fn, ReturnType<Fn>>()

function cache(fn: Fn): Fn {
  return (): ReturnType<Fn> => {
    if (cacheMap.has(fn)) {
      const value = cacheMap.get(fn)

      if (value) {
        return value
      }
    }

    const result = fn()
    cacheMap.set(fn, result)

    return result
  }
}

const fetchRecommendationQueries = cache(
  async function fetchRecommendationQueries(): Promise<string[]> {
    const res = await fetch('/api/queries')
    const queries = (await res.json()) as unknown

    if (
      !Array.isArray(queries) ||
      !queries.every((query): query is string => typeof query === 'string')
    ) {
      return []
    }

    return queries
  }
)

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

export default function RecommendationQueries(): JSX.Element {
  if (typeof window === 'undefined') {
    return <RecommendationQueriesSkeleton />
  }

  const queries = use(fetchRecommendationQueries())

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

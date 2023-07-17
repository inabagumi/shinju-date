import clsx from 'clsx'
import Link from 'next/link'
import Skeleton from '@/components/skeleton'
import { redisClient } from '@/lib/redis'
import styles from './recommendation-queries.module.css'

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

export default async function RecommendationQueries(): Promise<JSX.Element> {
  const queries = await redisClient.srandmember<string[]>(
    'recommendation_queries',
    4
  )

  if (!queries || queries.length < 1) {
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

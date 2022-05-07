import clsx from 'clsx'
import { type FC } from 'react'
import Link from './link'
import styles from './popularity-search-queries.module.css'

type Props = {
  values: string[]
}

const PopularitySearchQueries: FC<Props> = ({ values }) => {
  return values.length > 0 ? (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        {values.map((query) => (
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
  ) : null
}

export default PopularitySearchQueries

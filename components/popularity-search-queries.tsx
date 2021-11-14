import clsx from 'clsx'
import Link from './link'
import styles from './popularity-search-queries.module.css'
import type { VFC } from 'react'

type Props = {
  values: string[]
}

const PopularitySearchQueries: VFC<Props> = ({ values }) => {
  return values.length > 0 ? (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        {values.map((query) => (
          <li className={clsx('pills__item', styles.pill)} key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className={styles.pillLink}
              href={`/videos?q=${query}`}
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

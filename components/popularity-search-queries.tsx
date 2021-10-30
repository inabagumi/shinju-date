import clsx from 'clsx'
import Link from './link'
import styles from './popularity-search-queries.module.css'
import type { VFC } from 'react'

type Props = {
  keywords: string[]
}

const PopularitySearchQueries: VFC<Props> = ({ keywords }) => {
  return keywords.length > 0 ? (
    <div className="padding-vert--lg">
      <ul className="pills pills--block">
        {keywords.map((keyword) => (
          <li className={clsx('pills__item', styles.pill)} key={keyword}>
            <Link
              aria-label={`『${keyword}』の検索結果`}
              className={styles.pillLink}
              href={`/search?q=${keyword}`}
              title={`『${keyword}』の検索結果`}
            >
              {keyword}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  ) : null
}

export default PopularitySearchQueries

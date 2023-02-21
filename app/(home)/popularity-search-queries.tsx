import clsx from 'clsx'
import Link from 'next/link'
import styles from './popularity-search-queries.module.css'

type Props = {
  values: string[]
}

export default function PopularitySearchQueries({
  values
}: Props): JSX.Element {
  if (values.length < 1) {
    return <></>
  }

  return (
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
  )
}

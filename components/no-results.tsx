import { type FC } from 'react'
import { useBasePath } from './layout'
import Link from './link'
import styles from './no-results.module.css'

type Props = {
  message: string
  title?: string
}

const NoResults: FC<Props> = ({ message, title }) => {
  const basePath = useBasePath()

  return (
    <div className="text--center margin-bottom--lg margin-top--lg padding-bottom--lg padding-top--lg">
      {title && <h1 className={styles.title}>{title}</h1>}

      <p>{message}</p>

      <Link
        className="button button--lg button--outline button--primary"
        href={`${basePath}/videos`}
        role="button"
      >
        新着動画を見る
      </Link>
    </div>
  )
}

export default NoResults

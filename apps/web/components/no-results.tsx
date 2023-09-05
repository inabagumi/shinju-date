import Link from 'next/link'
import { joinURL } from 'ufo'
import styles from './no-results.module.css'

export default function NoResults({
  basePath = '/',
  message,
  title
}: {
  basePath?: string
  message: string
  title?: string
}) {
  return (
    <div className="text--center margin-bottom--lg margin-top--lg padding-bottom--lg padding-top--lg">
      {title && <h1 className={styles.title}>{title}</h1>}

      <p>{message}</p>

      <Link
        className="button button--lg button--outline button--primary"
        href={joinURL(basePath, '/videos')}
        role="button"
      >
        新着動画を見る
      </Link>
    </div>
  )
}

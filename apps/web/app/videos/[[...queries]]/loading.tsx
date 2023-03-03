import clsx from 'clsx'
import { SearchResultsSkeleton } from '@/ui/search-results'
import Skeleton from '@/ui/skeleton'
import styles from './page.module.css'

export default function Loading(): JSX.Element {
  return (
    <div className="margin-top--lg">
      <h1 className={clsx('margin-bottom--lg', styles.title)}>
        <Skeleton variant="text" />
      </h1>

      <SearchResultsSkeleton />
    </div>
  )
}

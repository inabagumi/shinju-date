import Link from 'next/link'
import { joinURL } from 'ufo'
import RecommendedQueries from './recommended-queries'

export default function NoResults({
  basePath = '/',
  message,
  recommendedQueries = [],
  title,
}: {
  basePath?: string
  message: string
  recommendedQueries?: string[]
  title?: string
}) {
  return (
    <div className="space-y-8 px-8 py-16 text-center">
      {title && <h1 className="text-2xl font-bold">{title}</h1>}

      <p className="text-balance">{message}</p>

      {recommendedQueries.length > 0 && (
        <div className="mx-auto max-w-2xl">
          <h2 className="text-774-nevy-500 dark:text-774-nevy-400 mb-4 text-sm">
            おすすめの検索キーワード
          </h2>
          <RecommendedQueries queries={recommendedQueries} />
        </div>
      )}

      <Link
        className="text-secondary-blue hover:bg-secondary-blue hover:text-secondary-blue-foreground dark:border-774-nevy-50 dark:text-774-nevy-50 dark:hover:bg-774-nevy-50 dark:hover:text-primary inline-block rounded-md border border-current px-6 py-3 font-semibold"
        href={joinURL(basePath, '/videos')}
      >
        新着動画を見る
      </Link>
    </div>
  )
}

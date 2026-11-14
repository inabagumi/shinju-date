import { Button } from '@shinju-date/ui'
import Link from 'next/link'
import { joinURL } from 'ufo'
import RecommendedQueries from './recommended-queries'

interface NoResultsProps {
  basePath?: string
  /** 見つからなかったときに次に試すことの案内 */
  hint?: string
  message: string
  recommendedQueries?: string[]
  title?: string
}

export default function NoResults({
  basePath = '/',
  hint,
  message,
  recommendedQueries = [],
  title,
}: NoResultsProps) {
  return (
    <div className="space-y-8 py-16 text-center">
      {title && <h1 className="text-title font-bold">{title}</h1>}

      <div className="mx-auto max-w-text space-y-2">
        <p className="text-body text-balance">{message}</p>
        {hint && <p className="text-meta text-balance text-muted">{hint}</p>}
      </div>

      {recommendedQueries.length > 0 && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-meta text-muted">
            おすすめの検索キーワード
          </h2>
          <RecommendedQueries queries={recommendedQueries} />
        </div>
      )}

      <Button asChild size="lg" variant="secondary">
        <Link href={joinURL(basePath, '/videos')}>新着動画を見る</Link>
      </Button>
    </div>
  )
}

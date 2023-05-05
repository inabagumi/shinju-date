import { type ReactNode, Suspense } from 'react'
import { SkipNavContent } from '@/ui/skip-nav'
import Hero from './hero'
import RecommendationQueries, {
  RecommendationQueriesSkeleton
} from './recommendation-queries'

type Props = {
  children: ReactNode
}

export default function HomeLayout({ children }: Props) {
  return (
    <>
      <Hero />

      <SkipNavContent>
        <main className="container">
          <Suspense fallback={<RecommendationQueriesSkeleton />}>
            <RecommendationQueries />
          </Suspense>

          <div className="margin-bottom--lg">{children}</div>
        </main>
      </SkipNavContent>
    </>
  )
}

import { type ReactNode, Suspense } from 'react'
import { SkipNavContent } from '@/components/skip-nav'
import Hero from './_components/hero'
import RecommendationQueries, {
  RecommendationQueriesSkeleton
} from './_components/recommendation-queries'

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

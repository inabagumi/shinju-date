import { type ReactNode, Suspense } from 'react'
import { SkipNavContent } from '@/ui/skip-nav'
import Hero from './hero'
import PopularitySearchQueries, {
  PopularitySearchQueriesSkeleton
} from './popularity-search-queries'

type Props = {
  children: ReactNode
}

export default function HomeLayout({ children }: Props) {
  return (
    <>
      <Hero />

      <SkipNavContent>
        <main className="container">
          <Suspense fallback={<PopularitySearchQueriesSkeleton />}>
            {/* @ts-expect-error Async Server Component */}
            <PopularitySearchQueries />
          </Suspense>

          <div className="margin-bottom--lg">{children}</div>
        </main>
      </SkipNavContent>
    </>
  )
}

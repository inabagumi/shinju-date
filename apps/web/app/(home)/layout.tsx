import { type ReactNode } from 'react'
import { SkipNavContent } from '@/ui/skip-nav'
import Hero from './hero'
import RecommendationQueries from './recommendation-queries'

type Props = {
  children: ReactNode
}

export default function HomeLayout({ children }: Props) {
  return (
    <>
      <Hero />

      <SkipNavContent>
        <main className="container">
          <RecommendationQueries />

          <div className="margin-bottom--lg">{children}</div>
        </main>
      </SkipNavContent>
    </>
  )
}

import { type ReactNode } from 'react'
import { SkipNavContent } from '@/ui/skip-nav'
import Hero from './hero'
import PopularitySearchQueries from './popularity-search-queries'

type Props = {
  children: ReactNode
}

export default function HomeLayout({ children }: Props) {
  return (
    <>
      <Hero />

      <SkipNavContent>
        <main className="container">
          <PopularitySearchQueries
            values={[
              'Minecraft',
              'ポケットモンスター',
              'Phasmophobia',
              'ELDEN RING'
            ]}
          />

          <div className="margin-bottom--lg">{children}</div>
        </main>
      </SkipNavContent>
    </>
  )
}

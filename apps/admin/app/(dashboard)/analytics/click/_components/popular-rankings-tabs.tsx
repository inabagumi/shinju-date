import { Activity, Suspense } from 'react'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'
import { PopularChannelsWidget } from './popular-channels-widget'
import { PopularVideosWidget } from './popular-videos-widget'

type Props = {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Server component that renders popular videos and channels tabs
 * Uses Activity component to show/hide content based on tab parameter
 */
export async function PopularRankingsTabs({ searchParams }: Props) {
  const { tab } = await searchParams
  const activeTab = tab || 'videos'

  return (
    <div>
      <Activity mode={activeTab === 'videos' ? 'visible' : 'hidden'}>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <PopularVideosWidget searchParams={searchParams} />
        </Suspense>
      </Activity>

      <Activity mode={activeTab === 'channels' ? 'visible' : 'hidden'}>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <PopularChannelsWidget searchParams={searchParams} />
        </Suspense>
      </Activity>
    </div>
  )
}

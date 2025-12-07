'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchLiveAndRecentVideos, type Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function LiveAndRecentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Desktop: Bento Grid */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        {/* Live section skeleton - Bento Grid */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">
            <span className="inline-block h-5 w-24 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <VideoCardSkeleton />
            </div>
            <VideoCardSkeleton />
            <VideoCardSkeleton />
          </div>
        </div>

        {/* Recent section skeleton - Bento Grid */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">
            <span className="inline-block h-5 w-32 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <VideoCardSkeleton />
            <VideoCardSkeleton />
            <div className="col-span-2">
              <VideoCardSkeleton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Horizontal scroll */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto px-4">
          <div className="w-80 flex-shrink-0">
            <VideoCardSkeleton />
          </div>
          <div className="w-80 flex-shrink-0">
            <VideoCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LiveAndRecent({
  prefetchedData,
}: {
  prefetchedData: {
    live: Video[]
    recent: Video[]
  }
}) {
  const {
    data = prefetchedData,
    isLoading,
    error,
  } = useQuery({
    initialData: prefetchedData,
    queryFn: () => fetchLiveAndRecentVideos(),
    queryKey: ['live-and-recent-videos'],
    refetchInterval: 60_000,
  })

  // If no live and no recent videos, don't render the section
  if (
    !isLoading &&
    !error &&
    data.live.length === 0 &&
    data.recent.length === 0
  ) {
    return null
  }

  if (isLoading) {
    return <LiveAndRecentSkeleton />
  }

  const hasLive = data.live.length > 0
  const hasRecent = data.recent.length > 0

  return (
    <div className="space-y-6">
      {/* Desktop: Bento Grid layout */}
      <div className="hidden md:block">
        <div className={hasLive && hasRecent ? 'grid grid-cols-2 gap-6' : ''}>
          {/* Live videos section - Bento Grid */}
          {hasLive && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-bold text-lg">
                <span className="inline-flex items-center gap-1 rounded-md bg-774-pink-600 px-2 py-1 text-sm text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  LIVE
                </span>
                配信中
              </h3>
              <div className="grid auto-rows-auto grid-cols-2 gap-4">
                {data.live.map((video, index) => {
                  // Create Bento Grid pattern: first item spans 2 columns, then alternating
                  const isWide =
                    index === 0 || (index > 0 && (index - 1) % 3 === 2)
                  return (
                    <div
                      className={isWide ? 'col-span-2' : 'col-span-1'}
                      key={video.id}
                    >
                      <VideoCard
                        dateTimeFormatOptions={{
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }}
                        value={video}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent videos section - Bento Grid */}
          {hasRecent && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">新着動画（48時間以内）</h3>
              <div className="grid auto-rows-auto grid-cols-2 gap-4">
                {data.recent.map((video, index) => {
                  // Create Bento Grid pattern: alternating layout starting with 2 small, then 1 wide
                  const isWide = index > 1 && (index - 2) % 3 === 0
                  return (
                    <div
                      className={isWide ? 'col-span-2' : 'col-span-1'}
                      key={video.id}
                    >
                      <VideoCard
                        dateTimeFormatOptions={{
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }}
                        value={video}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Horizontal scroll carousel */}
      <div className="md:hidden">
        <div className="overflow-x-auto">
          <div className="flex gap-4 px-4">
            {/* Live videos first */}
            {data.live.map((video) => (
              <div className="w-80 flex-shrink-0" key={video.id}>
                <VideoCard
                  dateTimeFormatOptions={{
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }}
                  value={video}
                />
              </div>
            ))}
            {/* Then recent videos */}
            {data.recent.map((video) => (
              <div className="w-80 flex-shrink-0" key={video.id}>
                <VideoCard
                  dateTimeFormatOptions={{
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }}
                  value={video}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

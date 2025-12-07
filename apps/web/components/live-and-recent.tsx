'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchLiveAndRecentVideos, type Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function LiveAndRecentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Live section skeleton */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">
            <span className="inline-block h-6 w-32 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <VideoCardSkeleton />
          </div>
        </div>

        {/* Recent section skeleton */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl">
            <span className="inline-block h-6 w-32 animate-pulse rounded-md bg-774-nevy-100 dark:bg-zinc-800" />
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <VideoCardSkeleton />
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

  // Desktop: Bento Grid layout
  // Mobile: Horizontal scroll
  return (
    <div className="space-y-6">
      {/* Mobile: Horizontal scroll */}
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

      {/* Desktop: Bento Grid */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-8">
        {/* Live videos section */}
        {data.live.length > 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-bold text-xl">
              <span className="inline-flex items-center gap-1 rounded-md bg-774-pink-600 px-2 py-1 text-sm text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                LIVE
              </span>
              配信中
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {data.live.map((video) => (
                <VideoCard
                  dateTimeFormatOptions={{
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }}
                  key={video.id}
                  value={video}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent videos section */}
        {data.recent.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-xl">新着動画（48時間以内）</h2>
            <div className="grid grid-cols-1 gap-6">
              {data.recent.map((video) => (
                <VideoCard
                  dateTimeFormatOptions={{
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }}
                  key={video.id}
                  value={video}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

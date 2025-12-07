'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchLiveAndRecentVideos, type Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function LiveAndRecentSkeleton() {
  return (
    <section className="space-y-6">
      <h2 className="text-right font-bold text-2xl">
        <span className="inline-block h-6 w-32 animate-pulse rounded-md bg-774-nevy-100" />
      </h2>

      <div className="grid grid-cols-1 gap-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <VideoCardSkeleton />
        <VideoCardSkeleton />
      </div>
    </section>
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

  // Combine live and recent videos, with live videos first
  const allVideos = [...data.live, ...data.recent]

  // If no videos, don't render the section
  if (!isLoading && !error && allVideos.length === 0) {
    return null
  }

  if (isLoading) {
    return <LiveAndRecentSkeleton />
  }

  // Use same layout as timeline sections
  return (
    <section className="space-y-6">
      <h2 className="text-right font-bold text-2xl">
        <span className="inline-flex items-center justify-end gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-774-pink-600 px-2 py-1 text-sm text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE
          </span>
          配信中 & 新着動画
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {allVideos.map((video) => (
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
    </section>
  )
}

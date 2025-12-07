'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity as ActivityIcon } from 'lucide-react'
import { Activity, Suspense, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { fetchLiveAndRecentVideos, type Video } from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function LiveAndRecentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab buttons skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-774-nevy-100 dark:bg-zinc-800" />
        <div className="h-10 w-24 animate-pulse rounded-lg bg-774-nevy-100 dark:bg-zinc-800" />
      </div>

      {/* Responsive layout */}
      <div className="space-y-4 px-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 md:px-0">
        {/* Featured large */}
        <div>
          <VideoCardSkeleton />
        </div>
        {/* 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <VideoCardSkeleton />
          <VideoCardSkeleton />
          <VideoCardSkeleton />
          <VideoCardSkeleton />
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

  const hasLive = data.live.length > 0
  const hasRecent = data.recent.length > 0

  // Default to live if available, otherwise recent
  const [activeTab, setActiveTab] = useState<'live' | 'recent'>(
    hasLive ? 'live' : 'recent',
  )

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

  const renderVideoGrid = (videos: Video[], tabName: 'live' | 'recent') => {
    if (videos.length === 0) return null

    return (
      <>
        {/* Main grid: Featured (left) + 2x2 Grid (right) */}
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {videos.map((video, index) => {
            if (index === 0) {
              // Featured video - left side, 2 rows span
              return (
                <div className="md:row-span-2" key={video.id}>
                  <VideoCard
                    dateTimeFormatOptions={{
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }}
                    value={video}
                  />
                </div>
              )
            }

            if (index >= 1 && index <= 4) {
              // 2x2 Grid videos - right side (videos 1-4)
              return null // Rendered in separate grid below
            }

            return null // Videos 5+ rendered in additional section
          })}

          {/* 2x2 Grid - right side */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {videos.map((video, index) => {
              if (index >= 1 && index <= 4) {
                return (
                  <VideoCard
                    compact
                    dateTimeFormatOptions={{
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }}
                    key={video.id}
                    value={video}
                  />
                )
              }
              return null
            })}
            {/* Fill remaining slots if less than 4 grid videos */}
            {videos.length < 5 &&
              Array.from({ length: Math.min(4, 5 - videos.length) }).map(
                (_, i) => (
                  <div
                    className="invisible"
                    key={`empty-${tabName}-grid-${videos.length + i}`}
                  />
                ),
              )}
          </div>
        </div>

        {/* Additional videos: 4-column grid (videos 5+) */}
        {videos.length > 5 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {videos.map((video, index) => {
              if (index >= 5) {
                return (
                  <VideoCard
                    compact
                    dateTimeFormatOptions={{
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }}
                    key={video.id}
                    value={video}
                  />
                )
              }
              return null
            })}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          className={twMerge(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors',
            activeTab === 'live'
              ? 'bg-774-pink-600 text-white'
              : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
            !hasLive && 'cursor-not-allowed opacity-50',
          )}
          disabled={!hasLive}
          onClick={() => setActiveTab('live')}
          type="button"
        >
          {activeTab === 'live' && (
            <ActivityIcon className="size-4 animate-pulse" />
          )}
          配信中
        </button>
        <button
          className={twMerge(
            'rounded-lg px-4 py-2 font-semibold transition-colors',
            activeTab === 'recent'
              ? 'bg-774-pink-600 text-white'
              : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
            !hasRecent && 'cursor-not-allowed opacity-50',
          )}
          disabled={!hasRecent}
          onClick={() => setActiveTab('recent')}
          type="button"
        >
          新着動画
        </button>
      </div>

      {/* Content Area with Activity boundaries for pre-rendering */}
      <Suspense fallback={<LiveAndRecentSkeleton />}>
        <Activity mode={activeTab === 'live' ? 'visible' : 'hidden'}>
          <div className="space-y-6">{renderVideoGrid(data.live, 'live')}</div>
        </Activity>
        <Activity mode={activeTab === 'recent' ? 'visible' : 'hidden'}>
          <div className="space-y-6">
            {renderVideoGrid(data.recent, 'recent')}
          </div>
        </Activity>
      </Suspense>
    </div>
  )
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
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

  const displayVideos = activeTab === 'live' ? data.live : data.recent

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
            <Activity className="size-4 animate-pulse" />
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

      {/* Content Area - CSS Grid Layout */}
      {displayVideos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-4 md:gap-4 md:px-0">
          {displayVideos.map((video, index) => {
            // Featured video: spans 2 columns on mobile, 1 column + 2 rows on desktop
            // Grid videos 2-5: positioned in a 2x2 grid on desktop (columns 2-3, rows 1-2)
            // Additional videos 6+: flow naturally in 4-column grid
            const isFeatured = index === 0
            const isGrid = index >= 1 && index <= 4

            // Build props conditionally to satisfy exactOptionalPropertyTypes
            const props: {
              className?: string
              compact?: boolean
              dateTimeFormatOptions?: Pick<
                Intl.DateTimeFormatOptions,
                'dateStyle' | 'timeStyle'
              >
              style?: React.CSSProperties
              value: Video
            } = {
              compact: !isFeatured,
              dateTimeFormatOptions: {
                dateStyle: 'short',
                timeStyle: 'short',
              },
              value: video,
            }

            if (isFeatured) {
              props.className =
                'col-span-2 row-span-2 md:col-span-1 md:row-span-2'
            }

            if (isGrid) {
              props.style = {
                gridColumn: index === 1 || index === 2 ? '2' : '3',
                gridRow: index === 1 || index === 3 ? '1' : '2',
              }
            }

            return <VideoCard key={video.id} {...props} />
          })}
          {/* Fill remaining slots with invisible placeholders if less than 5 videos */}
          {displayVideos.length < 5 &&
            Array.from({ length: 5 - displayVideos.length }).map((_, i) => {
              const totalIndex = displayVideos.length + i
              return (
                <div
                  className="invisible"
                  key={`empty-${activeTab}-${totalIndex}`}
                  style={
                    totalIndex >= 1 && totalIndex <= 4
                      ? ({
                          gridColumn:
                            totalIndex === 1 || totalIndex === 2 ? '2' : '3',
                          gridRow:
                            totalIndex === 1 || totalIndex === 3 ? '1' : '2',
                        } as React.CSSProperties)
                      : undefined
                  }
                />
              )
            })}
        </div>
      )}
    </div>
  )
}

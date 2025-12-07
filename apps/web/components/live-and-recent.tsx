'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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

      {/* Desktop: Featured + Grid */}
      <div className="hidden md:grid md:grid-cols-[1fr_2fr] md:gap-6">
        {/* Left: Featured large */}
        <div>
          <VideoCardSkeleton />
        </div>
        {/* Right: 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          <VideoCardSkeleton />
          <VideoCardSkeleton />
          <VideoCardSkeleton />
          <VideoCardSkeleton />
        </div>
      </div>

      {/* Mobile: Featured + Grid */}
      <div className="md:hidden">
        <div className="space-y-4 px-4">
          {/* Featured large */}
          <VideoCardSkeleton />
          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
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

  const [activeTab, setActiveTab] = useState<'live' | 'recent'>('live')

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

  // Auto-switch to recent tab if no live videos
  const currentTab = activeTab === 'live' && !hasLive ? 'recent' : activeTab
  const displayVideos = currentTab === 'live' ? data.live : data.recent

  // Get the featured video (newest/latest) and grid videos
  const featuredVideo = displayVideos[0]
  const gridVideos = displayVideos.slice(1)

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
            currentTab === 'live'
              ? 'bg-774-pink-600 text-white'
              : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
          } ${!hasLive ? 'cursor-not-allowed opacity-50' : ''}`}
          disabled={!hasLive}
          onClick={() => setActiveTab('live')}
          type="button"
        >
          <span className="flex items-center gap-2">
            {currentTab === 'live' && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            配信中
          </span>
        </button>
        <button
          className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
            currentTab === 'recent'
              ? 'bg-774-pink-600 text-white'
              : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
          } ${!hasRecent ? 'cursor-not-allowed opacity-50' : ''}`}
          disabled={!hasRecent}
          onClick={() => setActiveTab('recent')}
          type="button"
        >
          新着動画
        </button>
      </div>

      {/* Content Area */}
      {featuredVideo && (
        <>
          {/* Desktop Layout: Featured on left, 2x2 Grid on right */}
          <div className="hidden md:grid md:grid-cols-[1fr_2fr] md:gap-6">
            {/* Left: Featured large */}
            <div>
              <VideoCard
                dateTimeFormatOptions={{
                  dateStyle: 'short',
                  timeStyle: 'short',
                }}
                value={featuredVideo}
              />
            </div>

            {/* Right: 2x2 Grid (always show 4 slots) */}
            <div className="grid grid-cols-2 gap-4">
              {gridVideos.slice(0, 4).map((video) => (
                <VideoCard
                  dateTimeFormatOptions={{
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }}
                  key={video.id}
                  value={video}
                />
              ))}
              {/* Fill remaining slots with invisible placeholders */}
              {gridVideos.length < 4 &&
                Array.from({ length: 4 - gridVideos.length }).map((_, i) => (
                  <div
                    className="invisible"
                    key={`empty-${currentTab}-${gridVideos.length + i}`}
                  />
                ))}
            </div>
          </div>

          {/* Mobile Layout: Featured on top, 2x2 Grid below */}
          <div className="md:hidden">
            <div className="space-y-4 px-4">
              {/* Featured large */}
              <VideoCard
                dateTimeFormatOptions={{
                  dateStyle: 'short',
                  timeStyle: 'short',
                }}
                value={featuredVideo}
              />

              {/* 2x2 Grid */}
              {gridVideos.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {gridVideos.slice(0, 4).map((video) => (
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
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

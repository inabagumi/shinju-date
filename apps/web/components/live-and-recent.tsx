'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity as ActivityIcon,
  Film,
  Video as VideoIcon,
} from 'lucide-react'
import { Activity, Suspense, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { fetchDashboardVideos, type Video } from '@/lib/fetchers'
import ShortsCarousel from './shorts-carousel'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function LiveAndRecentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab buttons skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-774-nevy-100 dark:bg-zinc-800" />
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
    shorts: Video[]
  }
}) {
  const {
    data = prefetchedData,
    isLoading,
    error,
  } = useQuery({
    initialData: prefetchedData,
    queryFn: () => fetchDashboardVideos(),
    queryKey: ['dashboard-videos'],
    refetchInterval: 60_000,
  })

  const hasLive = data.live.length > 0
  const hasRecent = data.recent.length > 0
  const hasShorts = data.shorts.length > 0

  // Default to live if available, otherwise recent, otherwise shorts
  const getDefaultTab = (): 'live' | 'recent' | 'shorts' => {
    if (hasLive) return 'live'
    if (hasRecent) return 'recent'
    if (hasShorts) return 'shorts'
    return 'live' // Fallback to live even if empty
  }

  const [activeTab, setActiveTab] = useState<'live' | 'recent' | 'shorts'>(
    getDefaultTab(),
  )

  // If no live, no recent, and no shorts videos, don't render the section
  if (
    !isLoading &&
    !error &&
    data.live.length === 0 &&
    data.recent.length === 0 &&
    data.shorts.length === 0
  ) {
    return null
  }

  if (isLoading) {
    return <LiveAndRecentSkeleton />
  }

  const renderVideoGrid = (videos: Video[]) => {
    if (videos.length === 0) return null

    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {videos.map((video, index) => (
          <VideoCard
            className="first:col-span-2 md:first:row-span-2"
            compact={index > 0}
            dateTimeFormatOptions={{
              dateStyle: 'short',
              timeStyle: 'short',
            }}
            key={video.id}
            value={video}
          />
        ))}
      </div>
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
          <ActivityIcon
            className={twMerge(
              'size-4',
              activeTab === 'live' && 'animate-pulse',
            )}
          />
          配信中
        </button>
        <button
          className={twMerge(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors',
            activeTab === 'recent'
              ? 'bg-774-pink-600 text-white'
              : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
            !hasRecent && 'cursor-not-allowed opacity-50',
          )}
          disabled={!hasRecent}
          onClick={() => setActiveTab('recent')}
          type="button"
        >
          <VideoIcon className="size-4" />
          新着動画
        </button>
        <button
          className={twMerge(
            'flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors',
            activeTab === 'shorts'
              ? 'bg-774-pink-600 text-white'
              : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
            !hasShorts && 'cursor-not-allowed opacity-50',
          )}
          disabled={!hasShorts}
          onClick={() => setActiveTab('shorts')}
          type="button"
        >
          <Film className="size-4" />
          ショート
        </button>
      </div>

      {/* Content Area with Activity boundaries for pre-rendering */}
      <Suspense fallback={<LiveAndRecentSkeleton />}>
        <Activity mode={activeTab === 'live' ? 'visible' : 'hidden'}>
          <div className="space-y-6">{renderVideoGrid(data.live)}</div>
        </Activity>
        <Activity mode={activeTab === 'recent' ? 'visible' : 'hidden'}>
          <div className="space-y-6">{renderVideoGrid(data.recent)}</div>
        </Activity>
        <Activity mode={activeTab === 'shorts' ? 'visible' : 'hidden'}>
          <div className="space-y-6">
            <ShortsCarousel videos={data.shorts} />
          </div>
        </Activity>
      </Suspense>
    </div>
  )
}

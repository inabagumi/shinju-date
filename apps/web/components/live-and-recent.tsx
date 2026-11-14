'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Activity as ActivityIcon,
  Film,
  Video as VideoIcon,
} from 'lucide-react'
import { Activity, type ReactNode, Suspense, useState } from 'react'
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

interface TabButtonProps {
  count: number
  icon: ReactNode
  isActive: boolean
  label: string
  onClick: () => void
}

function TabButton({ count, icon, isActive, label, onClick }: TabButtonProps) {
  const isDisabled = count === 0

  return (
    <button
      className={twMerge(
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:gap-2 sm:px-4 sm:text-base',
        isActive
          ? 'bg-774-pink-600 text-white'
          : 'bg-774-nevy-100 text-774-nevy-800 hover:bg-774-nevy-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
        isDisabled && 'cursor-not-allowed opacity-50',
      )}
      disabled={isDisabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
      <span
        aria-hidden="true"
        className={twMerge(
          'min-w-5 rounded-full px-1.5 text-center text-xs leading-5 tabular-nums',
          isActive
            ? 'bg-white/20 text-white'
            : 'bg-774-nevy-800/10 text-774-nevy-800 dark:bg-white/10 dark:text-zinc-200',
        )}
      >
        {count}
      </span>
      <span className="sr-only">（{count}件）</span>
    </button>
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

  const [selectedTab, setSelectedTab] = useState<'live' | 'recent' | 'shorts'>(
    getDefaultTab(),
  )
  const activeTab =
    (selectedTab === 'live' && hasLive) ||
    (selectedTab === 'recent' && hasRecent) ||
    (selectedTab === 'shorts' && hasShorts)
      ? selectedTab
      : getDefaultTab()

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
      <div className="flex flex-wrap gap-2">
        <TabButton
          count={data.live.length}
          icon={
            <ActivityIcon
              className={twMerge(
                'hidden size-4 shrink-0 sm:block',
                activeTab === 'live' && 'animate-pulse',
              )}
            />
          }
          isActive={activeTab === 'live'}
          label="配信中"
          onClick={() => setSelectedTab('live')}
        />
        <TabButton
          count={data.recent.length}
          icon={<VideoIcon className="hidden size-4 shrink-0 sm:block" />}
          isActive={activeTab === 'recent'}
          label="新着動画"
          onClick={() => setSelectedTab('recent')}
        />
        <TabButton
          count={data.shorts.length}
          icon={<Film className="hidden size-4 shrink-0 sm:block" />}
          isActive={activeTab === 'shorts'}
          label="ショート"
          onClick={() => setSelectedTab('shorts')}
        />
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

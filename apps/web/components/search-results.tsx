'use client'

import { type DefaultDatabase } from '@shinju-date/supabase'
import { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite from 'swr/infinite'
import {
  SEARCH_RESULT_COUNT,
  type Video,
  fetchVideosByChannelIDs
} from '@/lib/fetchers'
import VideoCardList, { VideoCardListSkeleton } from './video-card-list'

export function SearchResultsSkeleton() {
  return (
    <div className="container">
      <VideoCardListSkeleton />
    </div>
  )
}

type Channel = Pick<
  DefaultDatabase['public']['Tables']['channels']['Row'],
  'id' | 'name' | 'slug'
>

export default function SearchResults({
  channels,
  prefetchedData,
  query = ''
}: {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
}) {
  const { data, setSize } = useSWRInfinite(
    (index) => ({
      channelIDs: channels && channels.map((channel) => channel.slug),
      page: index + 1,
      query
    }),
    fetchVideosByChannelIDs,
    prefetchedData && {
      fallbackData: prefetchedData
    }
  )

  const loadMore = useCallback(() => setSize((x) => x + 1), [setSize])

  const items = data ? data.flat() : []
  const isEmpty = data?.[0]?.length === 0
  const lastData = data && data[data.length - 1]
  const isReachingEnd =
    isEmpty || (lastData && lastData.length < SEARCH_RESULT_COUNT)

  return (
    <InfiniteScroll
      dataLength={items.length}
      hasMore={!isReachingEnd}
      loader={<VideoCardListSkeleton className="mt-12" />}
      next={loadMore}
      scrollThreshold={0.8}
      style={{
        WebkitOverflowScrolling: undefined,
        height: undefined,
        overflow: undefined
      }}
    >
      <VideoCardList
        dateTimeFormatOptions={{
          dateStyle: 'short',
          timeStyle: 'short'
        }}
        values={items}
      />
    </InfiniteScroll>
  )
}

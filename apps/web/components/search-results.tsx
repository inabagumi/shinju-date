'use client'

import { type Tables } from '@shinju-date/database'
import { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite from 'swr/infinite'
import { Temporal } from 'temporal-polyfill'
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

type Channel = Pick<Tables<'channels'>, 'id' | 'name' | 'slug'>

export default function SearchResults({
  channels,
  prefetchedData,
  query = ''
}: {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
}) {
  const { data = [], setSize } = useSWRInfinite(
    (_index, previousVideos: Video[] | null) => {
      const lastVideo = previousVideos?.at(-1)
      const until = lastVideo
        ? Temporal.Instant.from(lastVideo.published_at).subtract({
            nanoseconds: 1
          })
        : undefined

      return {
        channelIDs: channels && channels.map((channel) => channel.id),
        query,
        until
      }
    },
    fetchVideosByChannelIDs,
    prefetchedData && {
      fallbackData: prefetchedData
    }
  )

  const loadMore = useCallback(() => setSize((x) => x + 1), [setSize])

  const items = data.flat()
  const isEmpty = items.length === 0
  const lastData = data.at(-1)
  const isReachingEnd = isEmpty || (lastData?.length ?? 0) < SEARCH_RESULT_COUNT

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

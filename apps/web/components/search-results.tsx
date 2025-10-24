'use client'

import type { Tables } from '@shinju-date/database'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Temporal } from 'temporal-polyfill'
import { SEARCH_RESULT_COUNT } from '@/lib/constants'
import { fetchVideosByChannelIDs, type Video } from '@/lib/fetchers'
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
  query = '',
}: {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      getNextPageParam: (lastPage) => {
        if (lastPage.length < SEARCH_RESULT_COUNT) {
          return undefined
        }
        const lastVideo = lastPage.at(-1)
        if (!lastVideo) {
          return undefined
        }
        return Temporal.Instant.from(lastVideo.published_at).subtract({
          nanoseconds: 1,
        }).epochNanoseconds
      },
      ...(prefetchedData
        ? {
            initialData: {
              pageParams: [undefined],
              pages: prefetchedData,
            },
          }
        : {}),
      initialPageParam: undefined as bigint | undefined,
      queryFn: ({ pageParam }) => {
        return fetchVideosByChannelIDs({
          channelIDs: channels?.map((channel) => channel.id),
          query,
          until: pageParam,
        })
      },
      queryKey: [
        'videos',
        { channelIDs: channels?.map((channel) => channel.id), query },
      ],
    })

  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '200px',
    threshold: 0,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading && !data) {
    return <SearchResultsSkeleton />
  }

  const items = data?.pages.flat() ?? []
  const isEmpty = items.length === 0

  if (isEmpty) {
    return null // Let the parent handle empty state
  }

  return (
    <div>
      <VideoCardList
        dateTimeFormatOptions={{
          dateStyle: 'short',
          timeStyle: 'short',
        }}
        values={items}
      />

      {/* Loading trigger element */}
      <div className="flex h-10 items-center justify-center" ref={loadMoreRef}>
        {isFetchingNextPage && <VideoCardListSkeleton className="mt-12" />}
      </div>

      {/* End of data message */}
      {!hasNextPage && items.length > 0 && (
        <div className="py-8 text-center text-gray-500 text-sm">
          これ以上データはありません
        </div>
      )}
    </div>
  )
}

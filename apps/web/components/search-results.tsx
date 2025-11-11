'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Temporal } from 'temporal-polyfill'
import { SEARCH_RESULT_COUNT } from '@shinju-date/constants'
import { fetchVideos, type Video } from '@/lib/fetchers'
import VideoCardList, { VideoCardListSkeleton } from './video-card-list'

export function SearchResultsSkeleton() {
  return (
    <div className="container">
      <VideoCardListSkeleton />
    </div>
  )
}

export default function SearchResults({
  prefetchedData,
  query = '',
}: {
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
        return fetchVideos({
          query,
          until: pageParam,
        })
      },
      queryKey: ['videos', { query }],
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

      {/* Loading trigger element - only show when there might be more data */}
      {hasNextPage && (
        <div ref={loadMoreRef}>
          {isFetchingNextPage && <VideoCardListSkeleton className="mt-12" />}
        </div>
      )}

      {/* End of data message */}
      {!hasNextPage && !isFetchingNextPage && items.length > 0 && (
        <div className="mt-8 py-4 text-center text-gray-500 text-sm">
          これ以上データはありません
        </div>
      )}
    </div>
  )
}

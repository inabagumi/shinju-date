'use client'

import { type DefaultDatabase } from '@shinju-date/supabase'
import chunk from 'lodash.chunk'
import { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite from 'swr/infinite'
import {
  SEARCH_RESULT_COUNT,
  type Video,
  fetchVideosByChannelIDs
} from '@/lib/fetchers'
import VideoCard, { VideoCardSkeleton } from './video-card'

export function SearchResultsPlaceholder(): JSX.Element {
  return (
    <div className="row">
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCardSkeleton />
      </div>
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCardSkeleton />
      </div>
    </div>
  )
}

export function SearchResultsSkeleton(): JSX.Element {
  return (
    <div className="container">
      <SearchResultsPlaceholder />
    </div>
  )
}

type Channel = Pick<
  DefaultDatabase['public']['Tables']['channels']['Row'],
  'id' | 'name' | 'slug'
>

type Props = {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
}

export default function SearchResults({
  channels,
  prefetchedData,
  query = ''
}: Props) {
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
      className="container"
      dataLength={items.length}
      hasMore={!isReachingEnd}
      loader={<SearchResultsPlaceholder />}
      next={loadMore}
      scrollThreshold={0.8}
      style={{
        WebkitOverflowScrolling: undefined,
        height: undefined,
        overflow: undefined
      }}
    >
      {chunk(items, 3).map((values) => (
        <div className="row" key={values.map((value) => value.slug).join(':')}>
          {values.map((value) => (
            <div
              className="col col--4 padding-bottom--lg padding-horiz--sm"
              key={value.slug}
            >
              <VideoCard
                dateTimeFormatOptions={{
                  dateStyle: 'short',
                  timeStyle: 'short'
                }}
                value={value}
              />
            </div>
          ))}
        </div>
      ))}
    </InfiniteScroll>
  )
}

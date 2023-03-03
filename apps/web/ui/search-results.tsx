'use client'

import { type Database } from '@shinju-date/schema'
import chunk from 'lodash.chunk'
import { useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite from 'swr/infinite'
import { type Video } from '@/lib/algolia'
import { SEARCH_RESULT_COUNT, fetchVideosByChannelIDs } from '@/lib/fetchers'
import VideoCard from './video-card'

export function SearchResultsPlaceholder(): JSX.Element {
  return (
    <div className="row">
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
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
  Database['public']['Tables']['channels']['Row'],
  'id' | 'name' | 'slug'
>

type Props = {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
}

export default function SearchResults({
  channels = [],
  prefetchedData,
  query = ''
}: Props): JSX.Element {
  const { data, setSize } = useSWRInfinite(
    (index) => ({
      channelIDs: channels.map((channel) => channel.slug),
      page: index + 1,
      query
    }),
    fetchVideosByChannelIDs,
    {
      fallbackData: prefetchedData
    }
  )

  const loadMore = useCallback(() => setSize((x) => x + 1), [setSize])

  const items = data ? data.flat() : []
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd =
    isEmpty || (!!data && data[data.length - 1]?.length < SEARCH_RESULT_COUNT)

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
        <div className="row" key={values.map((value) => value.id).join(':')}>
          {values.map((value) => (
            <div
              className="col col--4 padding-bottom--lg padding-horiz--sm"
              key={value.id}
            >
              <VideoCard
                timeOptions={{
                  relativeTime: true
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

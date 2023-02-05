import { Temporal } from '@js-temporal/polyfill'
import clsx from 'clsx'
import chunk from 'lodash.chunk'
import { type FC, useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import useSWRInfinite, { type SWRInfiniteFetcher } from 'swr/infinite'
import { useBaseTime } from '../components/layout'
import { type Video, getVideosByChannelIDs } from '../lib/algolia'
import { getChannelBySlug } from '../lib/supabase'
import NoResults from './no-results'
import styles from './search-results.module.css'
import VideoCard from './video-card'

export const SEARCH_RESULT_COUNT = 9

export type Channel = NonNullable<Awaited<ReturnType<typeof getChannelBySlug>>>

type FetchVideosByChannelIDsOptions = {
  baseTime: number
  channelIDs?: string[]
  page?: number
  query?: string
}

type KeyLoader = (
  index: number,
  previousPageData: Video[]
) => FetchVideosByChannelIDsOptions

export const fetchVideosByChannelIDs: SWRInfiniteFetcher<
  Video[],
  KeyLoader
> = ({ baseTime: rawBaseTime, channelIDs = [], page = 1, query = '' }) => {
  const baseTime = Temporal.Instant.fromEpochSeconds(rawBaseTime)
  const until = baseTime
    .toZonedDateTimeISO('UTC')
    .add({ months: 2 })
    .toInstant()

  return getVideosByChannelIDs(channelIDs, {
    filters: [`publishedAt <= ${until.epochSeconds}`],
    limit: SEARCH_RESULT_COUNT,
    page,
    query
  })
}

type Props = {
  channels?: Channel[]
  prefetchedData?: Video[][]
  query?: string
  title?: string
}

const SearchResults: FC<Props> = ({
  channels = [],
  prefetchedData,
  query = '',
  title
}) => {
  const baseTime = useBaseTime()
  const { data, setSize } = useSWRInfinite<Video[], Error, KeyLoader>(
    (index) => ({
      baseTime: baseTime.epochSeconds,
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
  const placeholder = (
    <div className="row">
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
      <div className="col col--4 padding-bottom--lg padding-horiz--sm">
        <VideoCard />
      </div>
    </div>
  )

  return (
    <div className="container">
      {!isEmpty ? (
        <div className="margin-top--lg">
          {title && (
            <h1 className={clsx('margin-bottom--lg', styles.searchResultsFor)}>
              {title}
            </h1>
          )}

          <InfiniteScroll
            className="container"
            dataLength={items.length}
            hasMore={!isReachingEnd}
            loader={placeholder}
            next={loadMore}
            scrollThreshold={0.8}
            style={{
              WebkitOverflowScrolling: undefined,
              height: undefined,
              overflow: undefined
            }}
          >
            {chunk(items, 3).map((values) => (
              <div
                className="row"
                key={values.map((value) => value.id).join(':')}
              >
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
        </div>
      ) : (
        <NoResults
          message={`『${query}』で検索しましたが一致する動画は見つかりませんでした。`}
          title="検索結果はありません"
        />
      )}
    </div>
  )
}

export default SearchResults
